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

describe("Submissions", () => {
  const app = getTestApp();

  afterAll(async () => {
    await closeTestApp();
  });

  async function setupSubmissionEvent() {
    const org = await registerUser(app);
    await setRole(org.id, "organizer");
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
    return { ev, org };
  }

  it("participant creates a draft submission", async () => {
    const { ev } = await setupSubmissionEvent();
    const p = await registerUser(app);

    const result = (await rpcOk(
      app,
      "submissions.create",
      {
        eventId: ev.id,
        name: "My Project",
        tagline: "Cool stuff",
      },
      p.cookie
    )) as { id: string; status: string };

    expect(result.status).toBe("draft");
  });

  it("participant can update their draft", async () => {
    const { ev } = await setupSubmissionEvent();
    const p = await registerUser(app);

    const sub = (await rpcOk(
      app,
      "submissions.create",
      {
        eventId: ev.id,
        name: "Original",
      },
      p.cookie
    )) as { id: string };

    const updated = (await rpcOk(
      app,
      "submissions.update",
      {
        name: "Updated Name",
        submissionId: sub.id,
      },
      p.cookie
    )) as { name: string };

    expect(updated.name).toBe("Updated Name");
  });

  it("submitting changes status to submitted", async () => {
    const { ev } = await setupSubmissionEvent();
    const p = await registerUser(app);

    const sub = (await rpcOk(
      app,
      "submissions.create",
      {
        eventId: ev.id,
        name: "My Project",
      },
      p.cookie
    )) as { id: string };

    const result = (await rpcOk(
      app,
      "submissions.submit",
      {
        submissionId: sub.id,
      },
      p.cookie
    )) as { status: string; submittedAt: string };

    expect(result.status).toBe("submitted");
    expect(result.submittedAt).toBeTruthy();
  });

  it("another participant cannot edit someone else's submission", async () => {
    const { ev } = await setupSubmissionEvent();
    const p1 = await registerUser(app);
    const p2 = await registerUser(app);

    const sub = (await rpcOk(
      app,
      "submissions.create",
      {
        eventId: ev.id,
        name: "P1 Project",
      },
      p1.cookie
    )) as { id: string };

    const { status } = await rpc(
      app,
      "submissions.update",
      {
        name: "Hacked",
        submissionId: sub.id,
      },
      p2.cookie
    );
    expect(status).toBe(403);
  });

  it("DEADLINE ENFORCEMENT: cannot submit after deadline", async () => {
    const org = await registerUser(app);
    await setRole(org.id, "organizer");

    // Create event with deadline still open so a draft can be created
    const futureDate = new Date(Date.now() + 60_000).toISOString();
    const ev = await createEvent(app, org.cookie, {
      submissionDeadline: futureDate,
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
        name: "Late Project",
      },
      p.cookie
    )) as { id: string };

    // Expire the deadline
    await rpcOk(
      app,
      "events.update",
      {
        eventId: ev.id,
        submissionDeadline: new Date(Date.now() - 60_000).toISOString(),
      },
      org.cookie
    );

    // Final submit should fail — deadline has passed
    const { status } = await rpc(
      app,
      "submissions.submit",
      {
        submissionId: sub.id,
      },
      p.cookie
    );
    expect(status).toBe(400);
  });

  it("cannot edit a locked submission", async () => {
    const { ev } = await setupSubmissionEvent();
    const p = await registerUser(app);

    const sub = (await rpcOk(
      app,
      "submissions.create",
      {
        eventId: ev.id,
        name: "Project",
      },
      p.cookie
    )) as { id: string };

    // Manually lock via DB (simulate organizer lock)
    const { submission } = await import("@rave/db");
    const { db } = await import("../../composition/singletons");
    const { eq } = await import("drizzle-orm");
    await db
      .update(submission)
      .set({ status: "locked" })
      .where(eq(submission.id, sub.id));

    const { status } = await rpc(
      app,
      "submissions.update",
      {
        name: "Should fail",
        submissionId: sub.id,
      },
      p.cookie
    );
    expect(status).toBe(400);
  });

  it("gallery only shows submitted projects", async () => {
    const org = await registerUser(app);
    await setRole(org.id, "organizer");
    const ev = await createEvent(app, org.cookie, { isPublic: true });
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

    const p1 = await registerUser(app);
    const p2 = await registerUser(app);

    // p1 creates draft (not submitted)
    await rpcOk(
      app,
      "submissions.create",
      {
        eventId: ev.id,
        name: "Draft Project",
      },
      p1.cookie
    );

    // p2 creates + submits
    const sub2 = (await rpcOk(
      app,
      "submissions.create",
      {
        eventId: ev.id,
        name: "Submitted Project",
      },
      p2.cookie
    )) as { id: string };
    await rpcOk(
      app,
      "submissions.submit",
      { submissionId: sub2.id },
      p2.cookie
    );

    const gallery = (await rpcOk(app, "submissions.gallery", {
      eventId: ev.id,
    })) as { submissions: Array<{ id: string; status?: string }> };

    // Only submitted should appear
    expect(gallery.submissions.some((s) => s.id === sub2.id)).toBe(true);
    // All items must be submitted (no drafts)
    expect(
      gallery.submissions.every(
        (s) => !("status" in s) || s.status === "submitted"
      )
    ).toBe(true);
  });
});
