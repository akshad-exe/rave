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

describe("Events", () => {
  const app = getTestApp();

  afterAll(async () => {
    await closeTestApp();
  });

  it("creates an event (organizer)", async () => {
    const org = await registerUser(app);
    await setRole(org.id, "organizer");

    const slug = `test-${Date.now()}`;
    const result = await rpcOk(
      app,
      "events.create",
      {
        maxTeamSize: 4,
        name: "Hackathon 2026",
        slug,
        tagline: "Build something cool",
      },
      org.cookie
    );

    const ev = result as { id: string; slug: string; status: string };
    expect(ev.slug).toBe(slug);
    expect(ev.status).toBe("draft");
  });

  it("rejects duplicate slug", async () => {
    const org = await registerUser(app);
    await setRole(org.id, "organizer");

    const slug = `dup-${Date.now()}`;
    await rpcOk(app, "events.create", { name: "Event A", slug }, org.cookie);

    const { status } = await rpc(
      app,
      "events.create",
      { name: "Event B", slug },
      org.cookie
    );
    expect(status).toBe(400);
  });

  it("updates own event", async () => {
    const org = await registerUser(app);
    await setRole(org.id, "organizer");

    const ev = await createEvent(app, org.cookie);
    const result = await rpcOk(
      app,
      "events.update",
      {
        eventId: ev.id,
        name: "Updated Name",
      },
      org.cookie
    );

    const updated = result as { name: string };
    expect(updated.name).toBe("Updated Name");
  });

  it("transitions: draft → registration → submission → judging → results", async () => {
    const org = await registerUser(app);
    await setRole(org.id, "organizer");
    const ev = await createEvent(app, org.cookie);

    const transitions = [
      "registration",
      "submission",
      "judging",
      "results",
    ] as const;
    for (const status of transitions) {
      // biome-ignore lint/performance/noAwaitInLoops: transitions must run in sequence
      const result = await rpcOk(
        app,
        "events.transition",
        {
          eventId: ev.id,
          status,
        },
        org.cookie
      );
      expect((result as { status: string }).status).toBe(status);
    }
  });

  it("rejects invalid transition (draft → judging)", async () => {
    const org = await registerUser(app);
    await setRole(org.id, "organizer");
    const ev = await createEvent(app, org.cookie);

    const { status } = await rpc(
      app,
      "events.transition",
      {
        eventId: ev.id,
        status: "judging",
      },
      org.cookie
    );
    expect(status).toBe(400);
  });

  it("archived event cannot transition further", async () => {
    const org = await registerUser(app);
    await setRole(org.id, "organizer");
    const ev = await createEvent(app, org.cookie);

    // Advance to results
    for (const s of [
      "registration",
      "submission",
      "judging",
      "results",
      "archived",
    ]) {
      // biome-ignore lint/performance/noAwaitInLoops: transitions must run in sequence
      await rpcOk(
        app,
        "events.transition",
        { eventId: ev.id, status: s },
        org.cookie
      );
    }

    const { status } = await rpc(
      app,
      "events.transition",
      {
        eventId: ev.id,
        status: "draft",
      },
      org.cookie
    );
    expect(status).toBe(400);
  });

  it("public event list returns only public events", async () => {
    const org = await registerUser(app);
    await setRole(org.id, "organizer");

    const slug = `pub-${Date.now()}`;
    await rpcOk(
      app,
      "events.create",
      {
        isPublic: true,
        name: "Public Event",
        slug,
      },
      org.cookie
    );

    const result = (await rpcOk(app, "events.list", {
      limit: 50,
      page: 1,
    })) as {
      events: Array<{ slug: string }>;
    };
    const found = result.events.find((e) => e.slug === slug);
    expect(found).toBeTruthy();
  });
});
