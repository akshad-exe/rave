import type { Database } from "@rave/db";

import {
  account,
  event,
  judgeAssignment,
  rubric,
  rubricCriterion,
  score,
  submission,
  team,
  teamMember,
  track,
  user,
  userProfile,
} from "@rave/db";
import { hashPassword } from "better-auth/crypto";

import type { Fixtures } from "./fixtures";
import { CRITERION_WEIGHTS, type CriterionName } from "./fixtures";

/** Splits an email local part into name words: "ada.lovelace-1" -> 3 words. */
const EMAIL_WORD_SEPARATORS = /[._-]+/u;

/**
 * Shared password for every seeded account.
 *
 * These accounts exist so a reviewer can sign in as each role without
 * registering. The hash is computed once and reused, because scrypt is
 * deliberately slow and the seed creates well over a hundred users.
 */
export const SEED_PASSWORD = "rave2026demo";

const ORGANIZER_EMAIL = "organizer@rave.local";
const ORGANIZER_NAME = "Priya Raman";
const RUBRIC_ID = "rub_seed_01";

const CRITERION_LABELS: Record<CriterionName, string> = {
  functionality: "Functionality",
  innovation: "Innovation",
  quality: "Quality",
};

const CRITERION_IDS: Record<CriterionName, string> = {
  functionality: "crit_functionality",
  innovation: "crit_innovation",
  quality: "crit_quality",
};

type FixtureCriteria = Fixtures["scores"][number]["criteria"];

interface Identity {
  email: string;
  id: string;
  name: string;
  role: "judge" | "organizer" | "participant";
}

/** The four sign-ins the acceptance checker needs a header for. */
export interface SeedAccounts {
  judgeA: Identity;
  judgeB: Identity;
  organizer: Identity;
  participant: Identity;
}

export interface SeedCounts {
  assignments: number;
  criteria: number;
  judges: number;
  participants: number;
  projects: number;
  scores: number;
  teams: number;
  tracks: number;
}

export interface SeedResult {
  accounts: SeedAccounts;
  counts: SeedCounts;
  /** Fixture rows that could not be stored, and why. */
  notes: string[];
}

/** Deterministic, human-readable display name from an email local part. */
function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local
    .split(EMAIL_WORD_SEPARATORS)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

/**
 * Builds the full set of seeded users.
 *
 * The fixture names judges and team members by id and email but has no
 * organizer, so one is invented. Ids are derived from fixture ids wherever a
 * fixture id exists, which keeps the seeded database traceable back to
 * `fixtures.json` and makes re-running the seed a no-op.
 */
export function buildIdentities(fixtures: Fixtures): {
  accounts: SeedAccounts;
  identities: Identity[];
  userIdFor: (fixtureJudgeId: string) => string;
} {
  const identities: Identity[] = [];
  const byEmail = new Map<string, Identity>();
  const judgeUserId = new Map<string, string>();

  const add = (identity: Identity) => {
    if (byEmail.has(identity.email)) {
      return;
    }
    byEmail.set(identity.email, identity);
    identities.push(identity);
  };

  add({
    email: ORGANIZER_EMAIL,
    id: "usr_organizer",
    name: ORGANIZER_NAME,
    role: "organizer",
  });

  for (const judge of fixtures.judges) {
    const id = `usr_${judge.id}`;
    judgeUserId.set(judge.id, id);
    add({ email: judge.email, id, name: judge.name, role: "judge" });
  }

  // Team members are only known by email. Number them in first-appearance
  // order so ids stay stable for a given fixture file.
  let memberIndex = 0;
  for (const teamFixture of fixtures.teams) {
    for (const email of teamFixture.members) {
      if (byEmail.has(email)) {
        continue;
      }
      memberIndex += 1;
      add({
        email,
        id: `usr_mem_${String(memberIndex).padStart(3, "0")}`,
        name: nameFromEmail(email),
        role: "participant",
      });
    }
  }

  const organizer = byEmail.get(ORGANIZER_EMAIL);
  const judgeA = byEmail.get(fixtures.judges[0]?.email ?? "");
  const judgeB = byEmail.get(fixtures.judges[1]?.email ?? "");
  // The submit probe is sent by a real member of a real fixture team, so the
  // refusal the acceptance checker sees comes from the deadline rather than
  // from an unrelated validation error.
  const participant = byEmail.get(fixtures.teams[0]?.members[0] ?? "");

  if (!(organizer && judgeA && judgeB && participant)) {
    throw new Error(
      "Fixture must contain at least two judges, and its first team must have a member"
    );
  }

  return {
    accounts: { judgeA, judgeB, organizer, participant },
    identities,
    userIdFor: (fixtureJudgeId: string) => {
      const id = judgeUserId.get(fixtureJudgeId);
      if (!id) {
        throw new Error(`Fixture judge ${fixtureJudgeId} was not seeded`);
      }
      return id;
    },
  };
}

/** Weighted mean, matching `computeTotalScore` in the scoring service. */
function computeWeightedTotal(criteria: FixtureCriteria): string {
  return (Object.entries(criteria) as [CriterionName, number][])
    .reduce(
      (total, [name, value]) => total + (value * CRITERION_WEIGHTS[name]) / 100,
      0
    )
    .toFixed(4);
}

const assignmentIdFor = (judgeFixtureId: string, projectId: string) =>
  `asg_${judgeFixtureId}_${projectId}`;

/**
 * Writes the fixture into the database.
 *
 * Every insert ignores conflicts, so seeding an already-seeded database
 * changes nothing. That matters because the server seeds on every boot: a
 * restart must not duplicate rows or fail.
 *
 * @param db - Rave database handle
 * @param fixtures - Validated fixture data
 * @param log - Where progress messages go
 * @returns Row counts, the four acceptance accounts, and any skipped rows
 */
export async function seedFixtures(
  db: Database,
  fixtures: Fixtures,
  log: (message: string) => void
): Promise<SeedResult> {
  const notes: string[] = [];
  const { accounts, identities, userIdFor } = buildIdentities(fixtures);
  const criteria = Object.entries(CRITERION_WEIGHTS) as [
    CriterionName,
    number,
  ][];

  const submissionsClose = new Date(fixtures.event.submissions_close);
  const judgingEnds = new Date(submissionsClose.getTime() + 14 * 86_400_000);
  const ownerFor = (teamId: string): Identity => {
    const email = fixtures.teams.find((t) => t.id === teamId)?.members[0] ?? "";
    const owner = identities.find((identity) => identity.email === email);
    if (!owner) {
      throw new Error(`Fixture team ${teamId} has no members, so no owner`);
    }
    return owner;
  };

  // A team may submit only once per event, so the fixture's second project for
  // the same team cannot be stored. Keep the first and report the rest.
  const seenTeams = new Set<string>();
  const projects = fixtures.projects.filter((project) => {
    if (seenTeams.has(project.team)) {
      notes.push(
        `Skipped project "${project.title}" (${project.id}): team ${project.team} already submitted, and a team may submit only once per event.`
      );
      return false;
    }
    seenTeams.add(project.team);
    return true;
  });
  const projectById = new Map(projects.map((project) => [project.id, project]));

  // Scores hang off a submission, so a score for a project we could not store
  // cannot be stored either. Attaching it to the team's other project would
  // invent a judgment nobody made, so drop it and say so.
  const droppedProjectIds = new Set(
    fixtures.projects
      .filter((project) => !projectById.has(project.id))
      .map((project) => project.id)
  );
  const scores = fixtures.scores.filter(
    (fixtureScore) => !droppedProjectIds.has(fixtureScore.project)
  );
  if (droppedProjectIds.size > 0) {
    notes.push(
      `Skipped ${fixtures.scores.length - scores.length} score(s) for project(s) ${[...droppedProjectIds].join(", ")}, which have no submission to attach to.`
    );
  }

  await db.transaction(async (tx) => {
    // ── Accounts ───────────────────────────────────────────────────────
    // One password hash shared by every demo account; scrypt is slow by design.
    const password = await hashPassword(SEED_PASSWORD);

    await tx
      .insert(user)
      .values(
        identities.map((identity) => ({
          createdAt: submissionsClose,
          email: identity.email,
          emailVerified: true,
          id: identity.id,
          name: identity.name,
          updatedAt: submissionsClose,
        }))
      )
      .onConflictDoNothing();

    await tx
      .insert(account)
      .values(
        identities.map((identity) => ({
          accountId: identity.id,
          createdAt: submissionsClose,
          id: `acc_${identity.id}`,
          password,
          providerId: "credential",
          updatedAt: submissionsClose,
          userId: identity.id,
        }))
      )
      .onConflictDoNothing();

    await tx
      .insert(userProfile)
      .values(
        identities.map((identity) => ({
          role: identity.role,
          updatedAt: submissionsClose,
          userId: identity.id,
        }))
      )
      .onConflictDoNothing();

    // ── Event ──────────────────────────────────────────────────────────
    // The phase stays "submission" with the fixture's own close date in the
    // past, so a late submission is refused by the deadline check itself
    // rather than by a phase guard.
    await tx
      .insert(event)
      .values({
        allowIndividuals: false,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        description:
          "The DOGFOOD 2026 sample hackathon, seeded from the shared fixture file so every portal holds the same projects.",
        endDate: judgingEnds,
        id: fixtures.event.id,
        isPublic: true,
        judgingEndAt: judgingEnds,
        judgingStartAt: submissionsClose,
        maxTeamSize: 4,
        maxVotesPerUser: 3,
        minTeamSize: 1,
        name: fixtures.event.name,
        organizerId: accounts.organizer.id,
        registrationEndAt: submissionsClose,
        registrationStartAt: new Date("2026-01-01T00:00:00Z"),
        slug: slugify(fixtures.event.name),
        startDate: new Date("2026-02-01T00:00:00Z"),
        status: "submission",
        submissionDeadline: submissionsClose,
        submissionStartAt: new Date("2026-02-01T00:00:00Z"),
        tagline: "Sample event for the DOGFOOD acceptance checker",
        updatedAt: submissionsClose,
        // Voting is open on the seeded event so the T3 community-voting surface
        // is demonstrable. Results stay hidden while the window is open, which
        // is the same requirement T3 asks for.
        votingMode: "authenticated",
      })
      .onConflictDoNothing();

    await tx
      .insert(track)
      .values(
        fixtures.tracks.map((trackFixture, index) => ({
          createdAt: submissionsClose,
          eventId: fixtures.event.id,
          id: trackFixture.id,
          name: trackFixture.name,
          sortOrder: index,
        }))
      )
      .onConflictDoNothing();

    // ── Teams and members ──────────────────────────────────────────────
    await tx
      .insert(team)
      .values(
        fixtures.teams.map((teamFixture) => ({
          createdAt: submissionsClose,
          description: `Team ${teamFixture.name}`,
          eventId: fixtures.event.id,
          id: teamFixture.id,
          name: teamFixture.name,
          ownerId: ownerFor(teamFixture.id).id,
          updatedAt: submissionsClose,
        }))
      )
      .onConflictDoNothing();

    await tx
      .insert(teamMember)
      .values(
        fixtures.teams.flatMap((teamFixture) =>
          teamFixture.members.flatMap((email) => {
            const member = identities.find(
              (identity) => identity.email === email
            );
            return member
              ? [
                  {
                    joinedAt: submissionsClose,
                    teamId: teamFixture.id,
                    userId: member.id,
                  },
                ]
              : [];
          })
        )
      )
      .onConflictDoNothing();

    // ── Submissions ────────────────────────────────────────────────────
    await tx
      .insert(submission)
      .values(
        projects.map((project) => {
          const submittedAt = new Date(project.submitted_at);
          return {
            createdAt: submittedAt,
            description: project.summary,
            eventId: fixtures.event.id,
            id: project.id,
            name: project.title,
            repositoryUrl: project.repo_url,
            status: "submitted" as const,
            submittedAt,
            submitterId: ownerFor(project.team).id,
            tagline: project.summary,
            teamId: project.team,
            trackId: project.track,
            updatedAt: submittedAt,
          };
        })
      )
      .onConflictDoNothing();

    // ── Rubric ─────────────────────────────────────────────────────────
    await tx
      .insert(rubric)
      .values({
        createdAt: submissionsClose,
        description:
          "Three criteria with weights summing to 100, so the weighted total is the weighted mean.",
        eventId: fixtures.event.id,
        id: RUBRIC_ID,
        isWeighted: true,
        name: "Standard hackathon rubric",
        updatedAt: submissionsClose,
      })
      .onConflictDoNothing();

    await tx
      .insert(rubricCriterion)
      .values(
        criteria.map(([name, weight], index) => ({
          description: `Judge the ${CRITERION_LABELS[name].toLowerCase()} of the project.`,
          id: CRITERION_IDS[name],
          maxScore: 5,
          minScore: 1,
          name: CRITERION_LABELS[name],
          rubricId: RUBRIC_ID,
          sortOrder: index,
          weight: String(weight),
        }))
      )
      .onConflictDoNothing();

    // ── Assignments and scores ─────────────────────────────────────────
    // One assignment per scored (judge, project) pair. The fixture contains
    // no duplicate pairs, and the database forbids them anyway.
    await tx
      .insert(judgeAssignment)
      .values(
        scores.map((fixtureScore) => ({
          assignedAt: submissionsClose,
          completedAt: submissionsClose,
          eventId: fixtures.event.id,
          id: assignmentIdFor(fixtureScore.judge, fixtureScore.project),
          judgeId: userIdFor(fixtureScore.judge),
          status: "completed" as const,
          submissionId: fixtureScore.project,
          trackId: projectById.get(fixtureScore.project)?.track ?? null,
        }))
      )
      .onConflictDoNothing();

    await tx
      .insert(score)
      .values(
        scores.map((fixtureScore) => ({
          assignmentId: assignmentIdFor(
            fixtureScore.judge,
            fixtureScore.project
          ),
          criterionScores: criteria.map(([name]) => ({
            criterionId: CRITERION_IDS[name],
            score: fixtureScore.criteria[name],
          })),
          eventId: fixtures.event.id,
          feedback:
            fixtureScore.comment.length > 0 ? fixtureScore.comment : null,
          id: `scr_${fixtureScore.judge}_${fixtureScore.project}`,
          isLocked: false,
          judgeId: userIdFor(fixtureScore.judge),
          rubricId: RUBRIC_ID,
          submissionId: fixtureScore.project,
          submittedAt: submissionsClose,
          totalScore: computeWeightedTotal(fixtureScore.criteria),
          updatedAt: submissionsClose,
        }))
      )
      .onConflictDoNothing();
  });

  const counts: SeedCounts = {
    assignments: scores.length,
    criteria: criteria.length,
    judges: fixtures.judges.length,
    participants: identities.filter((i) => i.role === "participant").length,
    projects: projects.length,
    scores: scores.length,
    teams: fixtures.teams.length,
    tracks: fixtures.tracks.length,
  };

  log(
    `seeded "${fixtures.event.name}": ${counts.projects} projects, ${counts.teams} teams, ${counts.judges} judges, ${counts.scores} scores`
  );

  return { accounts, counts, notes };
}
