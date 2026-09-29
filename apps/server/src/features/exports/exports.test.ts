import { describe, expect, it } from "vitest";

import { parseCSV, parseCSVRecords, toCSV } from "../../lib/csv";
import {
  closeTestApp,
  createEvent,
  getTestApp,
  registerUser,
  rpc,
  rpcOk,
  setRole,
} from "../../tests/helpers";

describe("CSV parsing", () => {
  it("round-trips values containing commas, quotes and newlines", () => {
    const headers = ["name", "tagline"];
    const rows = [
      ["Plain", "simple"],
      ["Has, comma", 'says "hello"'],
      ["Has\nnewline", "multi\nline"],
    ];
    const records = parseCSVRecords(toCSV(headers, rows));
    expect(records).toEqual([
      { name: "Plain", tagline: "simple" },
      { name: "Has, comma", tagline: 'says "hello"' },
      { name: "Has\nnewline", tagline: "multi\nline" },
    ]);
  });

  it("handles CRLF line endings and a trailing newline", () => {
    const parsed = parseCSV("a,b\r\n1,2\r\n");
    expect(parsed).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("returns nothing for empty input", () => {
    expect(parseCSV("")).toEqual([]);
    expect(parseCSVRecords("")).toEqual([]);
  });
});

describe("Bulk import", () => {
  const app = getTestApp();

  async function setupEvent() {
    const org = await registerUser(app);
    await setRole(org.id, "organizer");
    const ev = await createEvent(app, org.cookie, {
      isPublic: true,
      maxTeamSize: 4,
    });
    await rpcOk(
      app,
      "events.transition",
      { eventId: ev.id, status: "registration" },
      org.cookie
    );
    await rpcOk(
      app,
      "events.transition",
      { eventId: ev.id, status: "submission" },
      org.cookie
    );
    return { ev, org };
  }

  it("creates submissions and reports bad rows individually", async () => {
    const { ev, org } = await setupEvent();
    const author = await registerUser(app);

    const csv = toCSV(
      ["name", "tagline", "status", "submitter_id", "tech_tags"],
      [
        ["Alpha", "first", "submitted", author.id, "react;bun"],
        ["Beta", "second", "submitted", author.id, ""],
        ["", "missing a name", "submitted", author.id, ""],
      ]
    );

    const result = (await rpcOk(
      app,
      "exports.importSubmissions",
      {
        csv,
        eventId: ev.id,
      },
      org.cookie
    )) as {
      created: number;
      errors: Array<{ field: string; row: number }>;
      skipped: number;
      updated: number;
    };

    expect(result.created).toBe(2);
    expect(result.skipped).toBe(1);
    // Row 3 is the header plus two good rows, so the bad one is data row 4.
    expect(result.errors[0]?.row).toBe(4);
    expect(result.errors[0]?.field).toBe("name");

    const gallery = (await rpcOk(app, "submissions.gallery", {
      eventId: ev.id,
      limit: 50,
    })) as { submissions: Array<{ name: string; techTags: string[] }> };
    const alpha = gallery.submissions.find((s) => s.name === "Alpha");
    expect(alpha?.techTags).toEqual(["react", "bun"]);
  });

  it("previews without writing when dryRun is set", async () => {
    const { ev, org } = await setupEvent();
    const csv = toCSV(["name"], [["Previewed"]]);

    const preview = (await rpcOk(
      app,
      "exports.importSubmissions",
      {
        csv,
        dryRun: true,
        eventId: ev.id,
      },
      org.cookie
    )) as { created: number };
    expect(preview.created).toBe(1);

    const gallery = (await rpcOk(app, "submissions.gallery", {
      eventId: ev.id,
      limit: 50,
    })) as { submissions: Array<{ name: string }> };
    expect(gallery.submissions.some((s) => s.name === "Previewed")).toBe(false);
  });

  it("updates rather than duplicates when an id is supplied", async () => {
    const { ev, org } = await setupEvent();
    const author = await registerUser(app);
    const original = toCSV(
      ["id", "name", "status", "submitter_id"],
      [["sub_import_1", "Original", "submitted", author.id]]
    );

    const first = (await rpcOk(
      app,
      "exports.importSubmissions",
      {
        csv: original,
        eventId: ev.id,
      },
      org.cookie
    )) as { created: number; updated: number };
    expect(first.created).toBe(1);
    expect(first.updated).toBe(0);

    const second = (await rpcOk(
      app,
      "exports.importSubmissions",
      {
        csv: original,
        eventId: ev.id,
      },
      org.cookie
    )) as { created: number; updated: number };
    expect(second.created).toBe(0);
    expect(second.updated).toBe(1);

    const gallery = (await rpcOk(app, "submissions.gallery", {
      eventId: ev.id,
      limit: 50,
    })) as { submissions: Array<{ id: string; name: string }> };
    expect(
      gallery.submissions.filter((s) => s.id === "sub_import_1")
    ).toHaveLength(1);
  });

  it("rejects a score row that has no judge assignment", async () => {
    const { ev, org } = await setupEvent();
    const csv = toCSV(
      ["score_id", "judge_id", "submission_id", "rubric_id", "total_score"],
      [["sco_x", "usr_ghost", "sub_ghost", "rub_ghost", "7"]]
    );

    const result = (await rpcOk(
      app,
      "exports.importScores",
      {
        csv,
        eventId: ev.id,
      },
      org.cookie
    )) as {
      created: number;
      errors: Array<{ message: string }>;
      skipped: number;
    };
    expect(result.created).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.errors[0]?.message).toContain("no judge assignment");
  });

  it("reports a malformed score row rather than failing the file", async () => {
    const { ev, org } = await setupEvent();
    const csv = toCSV(
      ["judge_id", "submission_id", "total_score"],
      [
        ["", "sub_1", "5"],
        ["usr_a", "", "5"],
        ["usr_a", "sub_1", "not-a-number"],
      ]
    );

    const result = (await rpcOk(
      app,
      "exports.importScores",
      {
        csv,
        eventId: ev.id,
      },
      org.cookie
    )) as { errors: unknown[]; skipped: number };
    expect(result.skipped).toBe(3);
    expect(result.errors).toHaveLength(3);
  });

  it("imports a team roster and is idempotent on membership", async () => {
    const { ev, org } = await setupEvent();
    const owner = await registerUser(app);
    const member = await registerUser(app);

    const csv = toCSV(
      ["team_id", "team_name", "owner_id", "member_user_id"],
      [
        ["", "The Underdogs", owner.id, owner.id],
        ["", "The Underdogs", "", member.id],
      ]
    );

    const first = (await rpcOk(
      app,
      "exports.importTeams",
      {
        csv,
        eventId: ev.id,
      },
      org.cookie
    )) as { created: number; skipped: number };
    expect(first.created).toBe(1);
    expect(first.skipped).toBe(0);

    // Re-importing the same roster must not add the member twice.
    const second = (await rpcOk(
      app,
      "exports.importTeams",
      {
        csv,
        eventId: ev.id,
      },
      org.cookie
    )) as { skipped: number };
    expect(second.skipped).toBe(0);

    // listByEvent returns a bare array, not a wrapper object.
    const teams = (await rpcOk(
      app,
      "teams.listByEvent",
      {
        eventId: ev.id,
      },
      org.cookie
    )) as Array<{ id: string; name: string }>;
    expect(teams.filter((t) => t.name === "The Underdogs")).toHaveLength(1);
  });

  it("reports a team row with no name", async () => {
    const { ev, org } = await setupEvent();
    const owner = await registerUser(app);
    const csv = toCSV(["team_name", "owner_id"], [["", owner.id]]);

    const result = (await rpcOk(
      app,
      "exports.importTeams",
      {
        csv,
        eventId: ev.id,
      },
      org.cookie
    )) as { errors: Array<{ message: string }>; skipped: number };
    expect(result.skipped).toBe(1);
    expect(result.errors[0]?.message).toContain("team_name");
  });

  it("imports judge assignments and rejects one with no judge", async () => {
    const { ev, org } = await setupEvent();
    const judge = await registerUser(app);
    const author = await registerUser(app);
    const sub = (await rpcOk(
      app,
      "submissions.create",
      {
        eventId: ev.id,
        name: "Assigned Project",
      },
      author.cookie
    )) as { id: string };
    await rpcOk(
      app,
      "submissions.submit",
      { submissionId: sub.id },
      author.cookie
    );

    const good = toCSV(
      ["assignment_id", "judge_id", "submission_id", "status"],
      [
        ["asg_1", judge.id, sub.id, "pending"],
        ["asg_2", "", sub.id, "pending"],
      ]
    );

    const result = (await rpcOk(
      app,
      "exports.importAssignments",
      {
        csv: good,
        eventId: ev.id,
      },
      org.cookie
    )) as {
      created: number;
      errors: Array<{ message: string }>;
      skipped: number;
    };
    expect(result.created).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.errors[0]?.message).toContain("judge_id");
  });

  it("refuses a non-organizer", async () => {
    const { ev } = await setupEvent();
    const participant = await registerUser(app);
    const csv = toCSV(["name"], [["Sneaky"]]);

    const { status } = await rpc(
      app,
      "exports.importSubmissions",
      {
        csv,
        eventId: ev.id,
      },
      participant.cookie
    );
    expect(status).toBeGreaterThanOrEqual(400);
  });

  it("closes the app", async () => {
    await closeTestApp();
  });
});
