/**
 * Seed and public-portal tests.
 *
 * These cover the DOGFOOD 2026 acceptance surface end to end: the fixture is
 * seeded, the four roles get working cookies, and the plain-HTTP routes behave
 * the way the acceptance checker expects.
 */
import { submission } from "@rave/db";
import { and, count, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { auth, db } from "../composition/singletons";
import { PORTAL_ROUTES, peerScoresRoute } from "../features/portal/paths";
import { closeTestApp, getTestApp } from "../tests/helpers";
import { loadFixtures } from "./fixtures";
import { renderDogfoodToml, runSeed, type SeedSummary } from "./index";

const { fixtures } = loadFixtures();

// Other suites share this database, so every row assertion is scoped to the
// event this seed owns.
const eventId = fixtures.event.id;

let seeded: SeedSummary;

/** The seed prints `Cookie: name=value`; inject wants the pair on its own. */
const COOKIE_PREFIX = /^Cookie:\s*/u;
const FULL_COOKIE_HEADER = /^Cookie: \S+=\S+$/u;
const ALREADY_SUBMITTED = /already submitted/u;
const SCORES_WERE_SKIPPED = /score\(s\)/u;

function asCookie(credential: string): string {
  return credential.replace(COOKIE_PREFIX, "");
}

const get = (url: string, cookie?: string) =>
  getTestApp().inject({
    headers: cookie ? { cookie } : {},
    method: "GET",
    url,
  });

beforeAll(async () => {
  getTestApp();
  seeded = await runSeed({
    auth,
    db,
    log: () => undefined,
  });
});

afterAll(closeTestApp);

describe("fixture seed", () => {
  it("stores every fixture row that the schema allows", () => {
    expect(seeded.counts.tracks).toBe(fixtures.tracks.length);
    expect(seeded.counts.teams).toBe(fixtures.teams.length);
    expect(seeded.counts.judges).toBe(fixtures.judges.length);
  });

  it("drops the scores of a project that could not be stored", async () => {
    // One project is dropped for the one-submission-per-team rule, so its
    // scores have nowhere to live. Every stored score must point at a
    // submission that exists.
    const orphanFree = await db.execute(sql`
      select count(*)::int as orphans
      from score
      left join submission on submission.id = score.submission_id
      where submission.id is null and score.event_id = ${eventId}
    `);

    expect(Number(orphanFree.rows[0]?.orphans ?? -1)).toBe(0);
    expect(seeded.counts.scores).toBeLessThan(fixtures.scores.length);
    expect(seeded.counts.scores).toBe(seeded.counts.assignments);
    expect(seeded.notes.join(" ")).toMatch(SCORES_WERE_SKIPPED);
  });

  it("keeps one project per team and reports the dropped one", async () => {
    // The fixture gives one team two projects, but a team may submit only once
    // per event, so exactly one of the 41 must be dropped.
    const stored = await db
      .select({ id: submission.id, teamId: submission.teamId })
      .from(submission)
      .where(eq(submission.eventId, eventId));
    const teamIds = stored.map((row) => row.teamId);

    expect(stored).toHaveLength(fixtures.projects.length - 1);
    expect(new Set(teamIds).size).toBe(stored.length);
    expect(seeded.counts.projects).toBe(fixtures.projects.length - 1);
    expect(seeded.notes[0]).toMatch(ALREADY_SUBMITTED);
  });

  it("keeps the first project when a team appears twice", () => {
    const duplicateTeam = fixtures.projects
      .map((project) => project.team)
      .find((teamId, index, all) => all.indexOf(teamId) !== index) as string;
    const firstForTeam = fixtures.projects.find(
      (project) => project.team === duplicateTeam
    );
    expect(firstForTeam).toBeDefined();
    expect(seeded.notes[0]).toContain(firstForTeam?.title ?? "missing");
  });

  it("reports a note for every dropped row", () => {
    // Two distinct problems: the duplicate project, and the scores that hang
    // off it. Both must be surfaced rather than silently swallowed.
    expect(seeded.notes.length).toBeGreaterThanOrEqual(2);
    for (const note of seeded.notes) {
      expect(note.length).toBeGreaterThan(0);
    }
  });

  it("is safe to run again", async () => {
    const countSubmissions = () =>
      db
        .select({ n: count() })
        .from(submission)
        .where(eq(submission.eventId, eventId));
    const before = await countSubmissions();
    const again = await runSeed({ auth, db, log: () => undefined });
    const after = await countSubmissions();

    expect(after[0]?.n).toBe(before[0]?.n);
    expect(again.counts).toEqual(seeded.counts);
  });

  it("issues a working cookie for each role", () => {
    for (const credential of Object.values(seeded.credentials)) {
      expect(credential).toMatch(FULL_COOKIE_HEADER);
    }
  });
});

describe("public gallery", () => {
  it("is public and shows fixture projects", async () => {
    const res = await get(PORTAL_ROUTES.gallery);

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");

    for (const project of fixtures.projects.slice(0, 3)) {
      expect(res.body).toContain(project.title);
    }
  });

  it("escapes project text instead of rendering it as markup", async () => {
    await db
      .update(submission)
      .set({ name: '<script>alert("x")</script>' })
      .where(
        and(
          eq(submission.id, fixtures.projects[0]?.id ?? ""),
          eq(submission.eventId, eventId)
        )
      );

    const res = await get(PORTAL_ROUTES.gallery);

    expect(res.body).not.toContain("<script>alert");
    expect(res.body).toContain("&lt;script&gt;");
  });
});

describe("closed event", () => {
  it("refuses a late submission with a 4xx", async () => {
    const res = await getTestApp().inject({
      headers: {
        "content-type": "application/json",
        cookie: asCookie(seeded.credentials.participant),
      },
      method: "POST",
      payload: JSON.stringify({
        summary: "probe",
        title: "dogfood-late-submission-probe",
      }),
      url: PORTAL_ROUTES.submit,
    });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });

  it("refuses the submission because the deadline has passed", async () => {
    const res = await getTestApp().inject({
      headers: {
        "content-type": "application/json",
        cookie: asCookie(seeded.credentials.participant),
      },
      method: "POST",
      payload: JSON.stringify({ summary: "probe", title: "probe" }),
      url: PORTAL_ROUTES.submit,
    });

    expect(res.body).toContain("deadline");
  });
});

describe("judge score isolation", () => {
  it("lets a judge read their own scores", async () => {
    const res = await get(
      PORTAL_ROUTES.judgeScores,
      asCookie(seeded.credentials.judgeA)
    );

    expect(res.statusCode).toBe(200);
    const body = res.json() as { count: number };
    expect(body.count).toBeGreaterThan(0);
  });

  it("refuses a judge asking for another judge's scores", async () => {
    const res = await get(
      peerScoresRoute("usr_jdg_01"),
      asCookie(seeded.credentials.judgeB)
    );

    expect([401, 403]).toContain(res.statusCode);
    // The refusal must not leak the other judge's work.
    expect(res.body).not.toContain("criterionScores");
  });

  it("lets a judge read their own scores through the ?judge= form", async () => {
    const res = await get(
      peerScoresRoute("usr_jdg_01"),
      asCookie(seeded.credentials.judgeA)
    );

    expect(res.statusCode).toBe(200);
  });

  it("refuses a participant", async () => {
    const res = await get(
      PORTAL_ROUTES.judgeScores,
      asCookie(seeded.credentials.participant)
    );

    expect([401, 403]).toContain(res.statusCode);
  });

  it("refuses an anonymous caller", async () => {
    const res = await get(PORTAL_ROUTES.judgeScores);

    expect([401, 403]).toContain(res.statusCode);
  });
});

describe("organizer export", () => {
  it("returns CSV to the organizer", async () => {
    const res = await get(
      PORTAL_ROUTES.csvExport,
      asCookie(seeded.credentials.organizer)
    );

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");

    const firstLine = res.body.split("\n")[0] ?? "";
    expect(firstLine).toContain(",");
  });

  it("refuses a judge", async () => {
    const res = await get(
      PORTAL_ROUTES.csvExport,
      asCookie(seeded.credentials.judgeA)
    );

    expect([401, 403]).toContain(res.statusCode);
  });
});

describe("generated .dogfood.toml", () => {
  it("points at the routes the server actually serves", () => {
    const toml = renderDogfoodToml(
      seeded.credentials,
      seeded.accounts,
      "http://localhost:3000",
      seeded.eventId
    );

    for (const route of Object.values(PORTAL_ROUTES)) {
      expect(toml).toContain(route);
    }
    expect(toml).toContain(peerScoresRoute(seeded.accounts.judgeA.id));
    expect(toml).toContain(`${PORTAL_ROUTES.vote}/${seeded.eventId}`);
    expect(toml).toContain('claimed = ["T1", "T2", "T3"]');
    expect(toml).toContain(seeded.credentials.judgeA);
  });
});
