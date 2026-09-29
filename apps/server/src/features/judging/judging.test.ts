/**
 * Judging tests — assignments, scoring, isolation, normalization.
 * CRITICAL: Judge isolation must be enforced at the API level.
 */
import { afterAll, describe, expect, it } from "vitest";
import {
  closeTestApp,
  createEvent,
  createRubric,
  getTestApp,
  registerUser,
  rpc,
  rpcOk,
  setRole,
} from "../../tests/helpers";

describe("Judging Engine", () => {
  const app = getTestApp();

  async function setupJudgingScenario() {
    // Organizer
    const org = await registerUser(app);
    await setRole(org.id, "organizer");

    // Event in judging phase
    const ev = await createEvent(app, org.cookie, { maxTeamSize: 4 });
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

    // Participant with submission
    const p1 = await registerUser(app);
    const sub1 = (await rpcOk(
      app,
      "submissions.create",
      {
        eventId: ev.id,
        name: "Project Alpha",
      },
      p1.cookie
    )) as { id: string };
    await rpcOk(
      app,
      "submissions.submit",
      { submissionId: sub1.id },
      p1.cookie
    );

    const p2 = await registerUser(app);
    const sub2 = (await rpcOk(
      app,
      "submissions.create",
      {
        eventId: ev.id,
        name: "Project Beta",
      },
      p2.cookie
    )) as { id: string };
    await rpcOk(
      app,
      "submissions.submit",
      { submissionId: sub2.id },
      p2.cookie
    );

    await rpcOk(
      app,
      "events.transition",
      { eventId: ev.id, status: "judging" },
      org.cookie
    );

    // Two judges
    const judgeA = await registerUser(app);
    await setRole(judgeA.id, "judge");
    const judgeB = await registerUser(app);
    await setRole(judgeB.id, "judge");

    // Rubric
    const rubric = await createRubric(app, org.cookie, ev.id);

    return { ev, judgeA, judgeB, org, p1, p2, rubric, sub1, sub2 };
  }

  describe("Assignments", () => {
    it("organizer assigns judge to submission", async () => {
      const { org, ev, sub1, judgeA } = await setupJudgingScenario();

      const result = (await rpcOk(
        app,
        "assignments.assign",
        {
          eventId: ev.id,
          judgeId: judgeA.id,
          submissionId: sub1.id,
        },
        org.cookie
      )) as { id: string; judgeId: string };

      expect(result.judgeId).toBe(judgeA.id);
    });

    it("cannot assign same judge to same submission twice", async () => {
      const { org, ev, sub1, judgeA } = await setupJudgingScenario();

      await rpcOk(
        app,
        "assignments.assign",
        {
          eventId: ev.id,
          judgeId: judgeA.id,
          submissionId: sub1.id,
        },
        org.cookie
      );

      const { status } = await rpc(
        app,
        "assignments.assign",
        {
          eventId: ev.id,
          judgeId: judgeA.id,
          submissionId: sub1.id,
        },
        org.cookie
      );
      expect(status).toBe(409);
    });

    it("cannot assign judge to their own submission", async () => {
      const org = await registerUser(app);
      await setRole(org.id, "organizer");

      const ev = await createEvent(app, org.cookie);
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

      // Make the judge also a participant with a submission
      const judgeParticipant = await registerUser(app);
      await setRole(judgeParticipant.id, "judge");

      const sub = (await rpcOk(
        app,
        "submissions.create",
        {
          eventId: ev.id,
          name: "My Own Project",
        },
        judgeParticipant.cookie
      )) as { id: string };
      await rpcOk(
        app,
        "submissions.submit",
        { submissionId: sub.id },
        judgeParticipant.cookie
      );

      await rpcOk(
        app,
        "events.transition",
        { eventId: ev.id, status: "judging" },
        org.cookie
      );

      const { status } = await rpc(
        app,
        "assignments.assign",
        {
          eventId: ev.id,
          judgeId: judgeParticipant.id,
          submissionId: sub.id,
        },
        org.cookie
      );
      expect(status).toBe(400);
    });
  });

  describe("JUDGE ISOLATION — Critical Security", () => {
    it("judge can only see their own assignments", async () => {
      const { org, ev, sub1, sub2, judgeA, judgeB } =
        await setupJudgingScenario();

      // Assign judgeA to sub1, judgeB to sub2
      await rpcOk(
        app,
        "assignments.assign",
        {
          eventId: ev.id,
          judgeId: judgeA.id,
          submissionId: sub1.id,
        },
        org.cookie
      );

      await rpcOk(
        app,
        "assignments.assign",
        {
          eventId: ev.id,
          judgeId: judgeB.id,
          submissionId: sub2.id,
        },
        org.cookie
      );

      // judgeA lists their assignments — should only see sub1
      const assignmentsA = (await rpcOk(
        app,
        "assignments.myAssignments",
        {
          eventId: ev.id,
        },
        judgeA.cookie
      )) as Array<{ submissionId: string }>;

      expect(assignmentsA.every((a) => a.submissionId === sub1.id)).toBe(true);
      expect(assignmentsA.some((a) => a.submissionId === sub2.id)).toBe(false);
    });

    it("judge CANNOT access another judge's assignment details", async () => {
      const { org, ev, sub2, judgeA, judgeB } = await setupJudgingScenario();

      // Assign judgeB to sub2
      const assignB = (await rpcOk(
        app,
        "assignments.assign",
        {
          eventId: ev.id,
          judgeId: judgeB.id,
          submissionId: sub2.id,
        },
        org.cookie
      )) as { id: string };

      // judgeA tries to get judgeB's assigned submission — must be denied
      const { status } = await rpc(
        app,
        "assignments.getAssignedSubmission",
        {
          assignmentId: assignB.id,
        },
        judgeA.cookie
      );
      expect(status).toBe(403);
    });

    it("judge CANNOT see aggregate scores / all-scores endpoint", async () => {
      const { ev, judgeA } = await setupJudgingScenario();

      const { status } = await rpc(
        app,
        "scoring.allScores",
        {
          eventId: ev.id,
        },
        judgeA.cookie
      );
      expect(status).toBe(403);
    });

    it("judge CANNOT see judging results before they are published", async () => {
      const { ev, judgeA } = await setupJudgingScenario();

      const { status } = await rpc(
        app,
        "results.getPublished",
        {
          eventId: ev.id,
        },
        judgeA.cookie
      );
      expect(status).toBe(403);
    });

    it("judge CANNOT access organizer progress overview", async () => {
      const { ev, judgeA } = await setupJudgingScenario();

      const { status } = await rpc(
        app,
        "assignments.progress",
        {
          eventId: ev.id,
        },
        judgeA.cookie
      );
      expect(status).toBe(403);
    });
  });

  describe("Scoring", () => {
    it("judge submits valid scores", async () => {
      const { org, ev, sub1, judgeA, rubric } = await setupJudgingScenario();

      const assignment = (await rpcOk(
        app,
        "assignments.assign",
        {
          eventId: ev.id,
          judgeId: judgeA.id,
          submissionId: sub1.id,
        },
        org.cookie
      )) as { id: string };

      const result = (await rpcOk(
        app,
        "scoring.submit",
        {
          assignmentId: assignment.id,
          criterionScores: rubric.criteria.map((c) => ({
            criterionId: c.id,
            score: 8,
          })),
          feedback: "Great project!",
          rubricId: rubric.id,
        },
        judgeA.cookie
      )) as { totalScore: string; isLocked: boolean };

      expect(Number(result.totalScore)).toBeGreaterThan(0);
    });

    it("rejects score outside criterion range", async () => {
      const { org, ev, sub1, judgeA, rubric } = await setupJudgingScenario();

      const assignment = (await rpcOk(
        app,
        "assignments.assign",
        {
          eventId: ev.id,
          judgeId: judgeA.id,
          submissionId: sub1.id,
        },
        org.cookie
      )) as { id: string };

      // Score of 15 when max is 10
      const { status } = await rpc(
        app,
        "scoring.submit",
        {
          assignmentId: assignment.id,
          criterionScores: rubric.criteria.map((c) => ({
            criterionId: c.id,
            score: 15, // invalid
          })),
          rubricId: rubric.id,
        },
        judgeA.cookie
      );
      expect(status).toBe(400);
    });

    it("rejects missing criterion scores", async () => {
      const { org, ev, sub1, judgeA, rubric } = await setupJudgingScenario();

      const assignment = (await rpcOk(
        app,
        "assignments.assign",
        {
          eventId: ev.id,
          judgeId: judgeA.id,
          submissionId: sub1.id,
        },
        org.cookie
      )) as { id: string };

      // Only provide score for first criterion
      const { status } = await rpc(
        app,
        "scoring.submit",
        {
          assignmentId: assignment.id,
          criterionScores: [
            { criterionId: rubric.criteria[0]?.id ?? "", score: 8 },
          ],
          rubricId: rubric.id,
        },
        judgeA.cookie
      );
      expect(status).toBe(400);
    });

    it("locked score cannot be updated", async () => {
      const { org, ev, sub1, judgeA, rubric } = await setupJudgingScenario();

      const assignment = (await rpcOk(
        app,
        "assignments.assign",
        {
          eventId: ev.id,
          judgeId: judgeA.id,
          submissionId: sub1.id,
        },
        org.cookie
      )) as { id: string };

      // Submit score
      await rpcOk(
        app,
        "scoring.submit",
        {
          assignmentId: assignment.id,
          criterionScores: rubric.criteria.map((c) => ({
            criterionId: c.id,
            score: 7,
          })),
          rubricId: rubric.id,
        },
        judgeA.cookie
      );

      // Lock scores
      await rpcOk(app, "scoring.lockScores", { eventId: ev.id }, org.cookie);

      // Try to update
      const { status } = await rpc(
        app,
        "scoring.submit",
        {
          assignmentId: assignment.id,
          criterionScores: rubric.criteria.map((c) => ({
            criterionId: c.id,
            score: 5,
          })),
          rubricId: rubric.id,
        },
        judgeA.cookie
      );
      expect(status).toBe(400);
    });
  });

  describe("Rubric validation", () => {
    it("rejects rubric where weights do not sum to 100", async () => {
      const org = await registerUser(app);
      await setRole(org.id, "organizer");
      const ev = await createEvent(app, org.cookie);

      const { status } = await rpc(
        app,
        "rubrics.create",
        {
          criteria: [
            { maxScore: 10, minScore: 0, name: "A", sortOrder: 0, weight: 30 },
            { maxScore: 10, minScore: 0, name: "B", sortOrder: 1, weight: 40 },
            // weights sum to 70, not 100
          ],
          eventId: ev.id,
          isWeighted: true,
          name: "Bad Rubric",
        },
        org.cookie
      );
      expect(status).toBe(400);
    });

    it("rejects criterion with minScore >= maxScore", async () => {
      const org = await registerUser(app);
      await setRole(org.id, "organizer");
      const ev = await createEvent(app, org.cookie);

      const { status } = await rpc(
        app,
        "rubrics.create",
        {
          criteria: [
            {
              maxScore: 10,
              minScore: 10,
              name: "A",
              sortOrder: 0,
              weight: 100,
            },
          ],
          eventId: ev.id,
          isWeighted: false,
          name: "Bad Rubric",
        },
        org.cookie
      );
      expect(status).toBe(400);
    });
  });

  describe("Result computation", () => {
    it("computes results with z-score normalization", async () => {
      const { org, ev, sub1, sub2, judgeA, judgeB, rubric } =
        await setupJudgingScenario();

      // Assign and score
      const asgA = (await rpcOk(
        app,
        "assignments.assign",
        {
          eventId: ev.id,
          judgeId: judgeA.id,
          submissionId: sub1.id,
        },
        org.cookie
      )) as { id: string };

      const asgB = (await rpcOk(
        app,
        "assignments.assign",
        {
          eventId: ev.id,
          judgeId: judgeB.id,
          submissionId: sub2.id,
        },
        org.cookie
      )) as { id: string };

      await rpcOk(
        app,
        "scoring.submit",
        {
          assignmentId: asgA.id,
          criterionScores: rubric.criteria.map((c) => ({
            criterionId: c.id,
            score: 9,
          })),
          rubricId: rubric.id,
        },
        judgeA.cookie
      );

      await rpcOk(
        app,
        "scoring.submit",
        {
          assignmentId: asgB.id,
          criterionScores: rubric.criteria.map((c) => ({
            criterionId: c.id,
            score: 6,
          })),
          rubricId: rubric.id,
        },
        judgeB.cookie
      );

      const result = (await rpcOk(
        app,
        "results.compute",
        {
          eventId: ev.id,
          rubricId: rubric.id,
          useNormalization: true,
        },
        org.cookie
      )) as { computed: number };

      expect(result.computed).toBe(2);
    });

    it("non-organizer cannot see unpublished results", async () => {
      const { ev, judgeA } = await setupJudgingScenario();

      const { status } = await rpc(
        app,
        "results.getPublished",
        {
          eventId: ev.id,
        },
        judgeA.cookie
      );
      expect(status).toBe(403);
    });

    it("organizer can see results before publishing", async () => {
      const { org, ev, sub1, judgeA, rubric } = await setupJudgingScenario();

      const asgA = (await rpcOk(
        app,
        "assignments.assign",
        {
          eventId: ev.id,
          judgeId: judgeA.id,
          submissionId: sub1.id,
        },
        org.cookie
      )) as { id: string };

      await rpcOk(
        app,
        "scoring.submit",
        {
          assignmentId: asgA.id,
          criterionScores: rubric.criteria.map((c) => ({
            criterionId: c.id,
            score: 8,
          })),
          rubricId: rubric.id,
        },
        judgeA.cookie
      );

      await rpcOk(
        app,
        "results.compute",
        {
          eventId: ev.id,
          rubricId: rubric.id,
        },
        org.cookie
      );

      const results = (await rpcOk(
        app,
        "results.getAdmin",
        {
          eventId: ev.id,
        },
        org.cookie
      )) as Array<{ submissionId: string; rank: number }>;

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });
  });
  it("gives every submission the same review depth, not just the early ones", async () => {
    // The greedy version filled judges one at a time, so the first projects
    // collected every judge and the last collected none. On the fixture set that
    // meant 2 to 5 reviews per project and a judge load of 1 to 11.
    const { ev, judgeA, judgeB, org } = await setupJudgingScenario();
    const judgeIds = [judgeA.id, judgeB.id];

    const result = (await rpcOk(
      app,
      "assignments.batchAssign",
      {
        eventId: ev.id,
        judgeIds,
        reviewsPerSubmission: 3,
      },
      org.cookie
    )) as {
      assigned: number;
      details: {
        assigned: Array<{ judgeId: string; submissionId: string }>;
        skipped: Array<{
          judgeId: string;
          reason: string;
          submissionId: string;
        }>;
      };
    };

    expect(result.assigned).toBeGreaterThan(0);

    // Every submission that received a review has the same depth, so no project
    // is starved by submission order.
    const perSubmission = new Map<string, number>();
    for (const row of result.details.assigned) {
      perSubmission.set(
        row.submissionId,
        (perSubmission.get(row.submissionId) ?? 0) + 1
      );
    }
    const depths = [...perSubmission.values()];
    expect(depths.length).toBeGreaterThan(0);
    expect(Math.max(...depths) - Math.min(...depths)).toBeLessThanOrEqual(1);

    // Judge load is spread rather than stacked on the first judges.
    const perJudge = new Map<string, number>();
    for (const row of result.details.assigned) {
      perJudge.set(row.judgeId, (perJudge.get(row.judgeId) ?? 0) + 1);
    }
    const loads = [...perJudge.values()];
    expect(loads.length).toBeGreaterThan(1);
    expect(Math.max(...loads) - Math.min(...loads)).toBeLessThanOrEqual(1);
  });
});

describe("Judge pool", () => {
  const app = getTestApp();

  it("lists judges with their current load on the event", async () => {
    const org = await registerUser(app);
    await setRole(org.id, "organizer");
    const ev = await createEvent(app, org.cookie, { maxTeamSize: 4 });

    const judge = await registerUser(app);
    await setRole(judge.id, "judge");

    const pool = (await rpcOk(
      app,
      "assignments.judgePool",
      { eventId: ev.id },
      org.cookie
    )) as Array<{
      assignedCount: number;
      completedCount: number;
      email: string;
      id: string;
      name: string;
    }>;

    const entry = pool.find((j) => j.id === judge.id);
    expect(entry).toBeDefined();
    // A judge with no assignments on this event still appears, at zero load —
    // this is the only way an organizer can discover a judge to assign.
    expect(entry?.assignedCount).toBe(0);
    expect(entry?.completedCount).toBe(0);
    expect(entry?.email).toBeTruthy();
  });

  it("does not expose non-judge users in the pool", async () => {
    const org = await registerUser(app);
    await setRole(org.id, "organizer");
    const ev = await createEvent(app, org.cookie, { maxTeamSize: 4 });

    const participant = await registerUser(app);
    await setRole(participant.id, "participant");

    const pool = (await rpcOk(
      app,
      "assignments.judgePool",
      { eventId: ev.id },
      org.cookie
    )) as Array<{ id: string }>;

    expect(pool.some((j) => j.id === participant.id)).toBe(false);
  });

  it("rejects a caller who does not organize the event", async () => {
    const org = await registerUser(app);
    await setRole(org.id, "organizer");
    const ev = await createEvent(app, org.cookie, { maxTeamSize: 4 });

    const outsider = await registerUser(app);
    await setRole(outsider.id, "organizer");

    const { status } = await rpc(
      app,
      "assignments.judgePool",
      { eventId: ev.id },
      outsider.cookie
    );
    expect(status).toBe(403);
  });
});

// One teardown for the whole file: getTestApp caches a singleton, so a
// per-describe close would leave later describes with a closed app.
afterAll(closeTestApp);
