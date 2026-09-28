import { afterAll, describe, expect, it } from "vitest";
import {
  closeTestApp,
  createEvent,
  getTestApp,
  registerUser,
  rpc,
  rpcOk,
  setRole,
} from "../../tests/helpers";

describe("Community Voting", () => {
  const app = getTestApp();

  /** oRPC nests the error payload under `json`; dig out the challenge fields. */
  function challengeOf(body: unknown): {
    code?: string;
    verificationCode?: string;
    verificationId?: string;
  } {
    const root = body as {
      data?: Record<string, unknown>;
      json?: { data?: Record<string, unknown> };
    };
    return (root.json?.data ?? root.data ?? {}) as {
      code?: string;
      verificationCode?: string;
      verificationId?: string;
    };
  }

  afterAll(async () => {
    await closeTestApp();
  });

  async function setupGatedVotingEvent() {
    const org = await registerUser(app);
    await setRole(org.id, "organizer");

    const ev = await createEvent(app, org.cookie, {
      isPublic: true,
      maxVotesPerUser: 3,
      votingMode: "gated",
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

    const p = await registerUser(app);
    const sub = (await rpcOk(
      app,
      "submissions.create",
      { eventId: ev.id, name: "Gated Project" },
      p.cookie
    )) as { id: string };
    await rpcOk(app, "submissions.submit", { submissionId: sub.id }, p.cookie);

    return { ev, org, p, sub };
  }

  async function setupVotingEvent() {
    const org = await registerUser(app);
    await setRole(org.id, "organizer");

    const ev = await createEvent(app, org.cookie, {
      isPublic: true,
      maxVotesPerUser: 3,
      votingMode: "authenticated",
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

    const p = await registerUser(app);
    const sub = (await rpcOk(
      app,
      "submissions.create",
      {
        eventId: ev.id,
        name: "Votable Project",
      },
      p.cookie
    )) as { id: string };
    await rpcOk(app, "submissions.submit", { submissionId: sub.id }, p.cookie);

    return { ev, org, p, sub };
  }

  it("authenticated user can vote", async () => {
    const { ev, sub } = await setupVotingEvent();
    const voter = await registerUser(app);

    const result = await rpcOk(
      app,
      "voting.vote",
      {
        eventId: ev.id,
        submissionId: sub.id,
      },
      voter.cookie
    );
    expect(result).toMatchObject({ ok: true });
  });

  it("DUPLICATE VOTE PREVENTION: same user cannot vote twice for same submission", async () => {
    const { ev, sub } = await setupVotingEvent();
    const voter = await registerUser(app);

    await rpcOk(
      app,
      "voting.vote",
      {
        eventId: ev.id,
        submissionId: sub.id,
      },
      voter.cookie
    );

    const { status } = await rpc(
      app,
      "voting.vote",
      {
        eventId: ev.id,
        submissionId: sub.id,
      },
      voter.cookie
    );
    expect(status).toBe(409);
  });

  it("vote limit per user is enforced", async () => {
    const org = await registerUser(app);
    await setRole(org.id, "organizer");

    // maxVotesPerUser = 2
    const ev = await createEvent(app, org.cookie, {
      isPublic: true,
      maxVotesPerUser: 2,
      votingMode: "authenticated",
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

    // Create 3 submissions
    const submissions: string[] = [];
    for (const index of [0, 1, 2]) {
      // biome-ignore lint/performance/noAwaitInLoops: submissions must be created sequentially in the same event
      const p = await registerUser(app);
      const sub = (await rpcOk(
        app,
        "submissions.create",
        {
          eventId: ev.id,
          name: `Project ${index}`,
        },
        p.cookie
      )) as { id: string };
      await rpcOk(
        app,
        "submissions.submit",
        { submissionId: sub.id },
        p.cookie
      );
      submissions.push(sub.id);
    }

    const voter = await registerUser(app);
    const [first, second, third] = submissions;

    // Vote 1 & 2 should succeed
    await rpcOk(
      app,
      "voting.vote",
      { eventId: ev.id, submissionId: first ?? "" },
      voter.cookie
    );
    await rpcOk(
      app,
      "voting.vote",
      { eventId: ev.id, submissionId: second ?? "" },
      voter.cookie
    );

    // Vote 3 should fail (over limit)
    const { status } = await rpc(
      app,
      "voting.vote",
      {
        eventId: ev.id,
        submissionId: third ?? "",
      },
      voter.cookie
    );
    expect(status).toBe(400);
  });

  it("HIDDEN RESULTS: vote counts not visible when results hidden", async () => {
    const { ev, sub } = await setupVotingEvent();
    const voter = await registerUser(app);
    await rpcOk(
      app,
      "voting.vote",
      { eventId: ev.id, submissionId: sub.id },
      voter.cookie
    );

    // votingResultsVisible defaults to false
    const { status } = await rpc(app, "voting.counts", {
      eventId: ev.id,
    }); // no auth
    expect(status).toBe(403);
  });

  it("vote counts visible when results revealed", async () => {
    const { ev, sub, org } = await setupVotingEvent();
    const voter = await registerUser(app);
    await rpcOk(
      app,
      "voting.vote",
      { eventId: ev.id, submissionId: sub.id },
      voter.cookie
    );

    // Organizer reveals voting results
    await rpcOk(
      app,
      "events.update",
      {
        eventId: ev.id,
        // votingResultsVisible: true — set via DB directly since no dedicated route
      },
      org.cookie
    );

    // Use DB to set visibility
    const { event: eventTable } = await import("@rave/db");
    const { db } = await import("../../composition/singletons");
    const { eq } = await import("drizzle-orm");
    await db
      .update(eventTable)
      .set({ votingResultsVisible: true })
      .where(eq(eventTable.id, ev.id));

    const counts = (await rpcOk(
      app,
      "voting.counts",
      {
        eventId: ev.id,
      },
      org.cookie
    )) as Array<{ submissionId: string; votes: number }>;

    const myCounts = counts.find((c) => c.submissionId === sub.id);
    expect(myCounts?.votes).toBe(1);
  });

  it("unauthenticated user cannot vote when mode is authenticated", async () => {
    const { ev, sub } = await setupVotingEvent();
    // No cookie
    const { status } = await rpc(app, "voting.vote", {
      eventId: ev.id,
      submissionId: sub.id,
    });
    expect(status).toBe(401);
  });
  describe("gated voting", () => {
    it("challenges a vote instead of recording it, and the code completes it", async () => {
      const { ev, sub } = await setupGatedVotingEvent();
      const voter = await registerUser(app);

      const attempt = await rpc(
        app,
        "voting.vote",
        {
          eventId: ev.id,
          submissionId: sub.id,
        },
        voter.cookie
      );
      expect(attempt.status, JSON.stringify(attempt.body)).toBe(401);
      const { code, verificationCode, verificationId } = challengeOf(
        attempt.body
      );
      expect(code, JSON.stringify(attempt.body)).toBe("VERIFICATION_REQUIRED");
      if (!(verificationId && verificationCode)) {
        throw new Error(
          `challenge missing fields: ${JSON.stringify(attempt.body)}`
        );
      }

      // A wrong code must not verify.
      const wrong = await rpc(
        app,
        "voting.verifyVoting",
        {
          code: "not-the-code",
          verificationId,
        },
        voter.cookie
      );
      expect(wrong.status).toBe(401);

      // A missing code is rejected by the contract before the service runs.
      const noCode = await rpc(
        app,
        "voting.verifyVoting",
        {
          code: "",
          verificationId,
        },
        voter.cookie
      );
      expect(noCode.status).toBe(400);

      // NODE_ENV is "test" here, so the code is echoed back rather than emailed.
      const verified = await rpcOk(
        app,
        "voting.verifyVoting",
        {
          code: verificationCode,
          verificationId,
        },
        voter.cookie
      );
      expect(verified).toMatchObject({ ok: true });

      const counted = await rpcOk(
        app,
        "voting.vote",
        { eventId: ev.id, submissionId: sub.id },
        voter.cookie
      );
      expect(counted).toMatchObject({ ok: true });
    });

    it("refuses a replayed verification", async () => {
      const { ev, sub } = await setupGatedVotingEvent();
      const voter = await registerUser(app);

      const attempt = await rpc(
        app,
        "voting.vote",
        {
          eventId: ev.id,
          submissionId: sub.id,
        },
        voter.cookie
      );
      const { verificationCode, verificationId } = challengeOf(attempt.body);
      if (!(verificationId && verificationCode)) {
        throw new Error(
          `challenge missing fields: ${JSON.stringify(attempt.body)}`
        );
      }

      await rpcOk(
        app,
        "voting.verifyVoting",
        {
          code: verificationCode,
          verificationId,
        },
        voter.cookie
      );

      const replay = await rpc(
        app,
        "voting.verifyVoting",
        {
          code: verificationCode,
          verificationId,
        },
        voter.cookie
      );
      expect(replay.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("randomised ballot ordering", () => {
    it("is stable for the same voter but differs between voters", async () => {
      const { ev, p } = await setupVotingEvent();
      const other = await registerUser(app);

      // One submission per user per event, so each project needs its own author.
      const projectNames = ["Alpha", "Bravo", "Charlie", "Delta"];
      // Each submission needs its own author, so these are created in sequence
      // rather than in parallel: they share the event's one-per-user slot.
      for (const name of projectNames) {
        // biome-ignore lint/performance/noAwaitInLoops: each author needs its own event slot, so these cannot run in parallel
        const author = await registerUser(app);
        const created = (await rpcOk(
          app,
          "submissions.create",
          { eventId: ev.id, name },
          author.cookie
        )) as { id: string };
        await rpcOk(
          app,
          "submissions.submit",
          { submissionId: created.id },
          author.cookie
        );
      }

      const first = (await rpcOk(
        app,
        "submissions.gallery",
        { eventId: ev.id, limit: 50, sortBy: "random" },
        p.cookie
      )) as { submissions: Array<{ id: string }> };
      const repeat = (await rpcOk(
        app,
        "submissions.gallery",
        { eventId: ev.id, limit: 50, sortBy: "random" },
        p.cookie
      )) as { submissions: Array<{ id: string }> };
      const different = (await rpcOk(
        app,
        "submissions.gallery",
        { eventId: ev.id, limit: 50, sortBy: "random" },
        other.cookie
      )) as { submissions: Array<{ id: string }> };

      expect(first.submissions.map((s) => s.id)).toEqual(
        repeat.submissions.map((s) => s.id)
      );
      expect(first.submissions.map((s) => s.id)).not.toEqual(
        different.submissions.map((s) => s.id)
      );
    });
  });
});
