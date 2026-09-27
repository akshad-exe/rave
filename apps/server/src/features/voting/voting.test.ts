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

  afterAll(async () => {
    await closeTestApp();
  });

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
});
