/**
 * Security tests — IDOR, privilege escalation, cross-event access,
 * sensitive data exposure, audit trail.
 */
import { afterAll, describe, expect, it } from "vitest";
import {
  closeTestApp,
  createEvent,
  getTestApp,
  registerUser,
  rpc,
  rpcOk,
  setRole,
} from "./helpers";

describe("Security", () => {
  const app = getTestApp();

  afterAll(async () => {
    await closeTestApp();
  });

  describe("IDOR prevention", () => {
    it("user cannot read another user's submission (draft)", async () => {
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

      const p1 = await registerUser(app);
      const sub = (await rpcOk(
        app,
        "submissions.create",
        {
          eventId: ev.id,
          name: "Secret Draft",
        },
        p1.cookie
      )) as { id: string };

      const p2 = await registerUser(app);
      const { status } = await rpc(
        app,
        "submissions.get",
        {
          submissionId: sub.id,
        },
        p2.cookie
      );
      expect(status).toBe(403);
    });

    it("user cannot update another user's submission", async () => {
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

      const p1 = await registerUser(app);
      const sub = (await rpcOk(
        app,
        "submissions.create",
        {
          eventId: ev.id,
          name: "Owned",
        },
        p1.cookie
      )) as { id: string };

      const attacker = await registerUser(app);
      const { status } = await rpc(
        app,
        "submissions.update",
        {
          name: "Owned by attacker",
          submissionId: sub.id,
        },
        attacker.cookie
      );
      expect(status).toBe(403);
    });

    it("team member cannot remove another team's members", async () => {
      const org = await registerUser(app);
      await setRole(org.id, "organizer");
      const ev = await createEvent(app, org.cookie);
      await rpcOk(
        app,
        "events.transition",
        { eventId: ev.id, status: "registration" },
        org.cookie
      );

      const owner = await registerUser(app);
      const victim = await registerUser(app);
      const attacker = await registerUser(app);

      const t = (await rpcOk(
        app,
        "teams.create",
        {
          eventId: ev.id,
          name: "T",
        },
        owner.cookie
      )) as { id: string };

      const inv = (await rpcOk(
        app,
        "teams.createInvitation",
        {
          teamId: t.id,
        },
        owner.cookie
      )) as { token: string };
      await rpcOk(
        app,
        "teams.acceptInvitation",
        { token: inv.token },
        victim.cookie
      );

      // attacker tries to remove victim from owner's team
      const { status } = await rpc(
        app,
        "teams.removeMember",
        {
          teamId: t.id,
          userId: victim.id,
        },
        attacker.cookie
      );
      expect(status).toBe(403);
    });
  });

  describe("Cross-event access prevention", () => {
    it("submission from event A cannot be assigned in event B", async () => {
      const org = await registerUser(app);
      await setRole(org.id, "organizer");

      const evA = await createEvent(app, org.cookie);
      await rpcOk(
        app,
        "events.transition",
        { eventId: evA.id, status: "registration" },
        org.cookie
      );
      await rpcOk(
        app,
        "events.transition",
        { eventId: evA.id, status: "submission" },
        org.cookie
      );

      const evB = await createEvent(app, org.cookie);
      await rpcOk(
        app,
        "events.transition",
        { eventId: evB.id, status: "registration" },
        org.cookie
      );
      await rpcOk(
        app,
        "events.transition",
        { eventId: evB.id, status: "submission" },
        org.cookie
      );
      await rpcOk(
        app,
        "events.transition",
        { eventId: evB.id, status: "judging" },
        org.cookie
      );

      const p = await registerUser(app);
      const sub = (await rpcOk(
        app,
        "submissions.create",
        {
          eventId: evA.id,
          name: "Sub A",
        },
        p.cookie
      )) as { id: string };
      await rpcOk(
        app,
        "submissions.submit",
        { submissionId: sub.id },
        p.cookie
      );

      const judge = await registerUser(app);
      await setRole(judge.id, "judge");

      // Try to assign sub from evA into evB
      const { status } = await rpc(
        app,
        "assignments.assign",
        {
          eventId: evB.id,
          judgeId: judge.id,
          submissionId: sub.id, // wrong event
        },
        org.cookie
      );
      expect(status).toBe(400);
    });
  });

  describe("Privilege escalation", () => {
    it("user cannot escalate their own role via setRole", async () => {
      const user = await registerUser(app);
      // participant tries to make themselves admin
      const { status } = await rpc(
        app,
        "admin.setRole",
        {
          role: "admin",
          userId: user.id,
        },
        user.cookie
      );
      expect(status).toBe(403);
    });
  });

  describe("Audit trail", () => {
    it("sensitive actions create audit records", async () => {
      const admin = await registerUser(app);
      await setRole(admin.id, "admin");

      const org = await registerUser(app);
      await setRole(org.id, "organizer");

      const ev = await createEvent(app, org.cookie);

      // Admin reads audit log
      const logs = (await rpcOk(
        app,
        "admin.auditLog",
        {
          eventId: ev.id,
          limit: 100,
          page: 1,
        },
        admin.cookie
      )) as Array<{ action: string }>;

      // Must find event.create entry
      expect(logs.some((l) => l.action === "event.create")).toBe(true);
    });

    it("audit log is not accessible to non-organizers", async () => {
      const org = await registerUser(app);
      await setRole(org.id, "organizer");
      const ev = await createEvent(app, org.cookie);

      const stranger = await registerUser(app);
      const { status } = await rpc(
        app,
        "admin.auditLog",
        {
          eventId: ev.id,
          limit: 50,
          page: 1,
        },
        stranger.cookie
      );
      expect(status).toBe(403);
    });

    it("secrets are never in audit log metadata", async () => {
      const admin = await registerUser(app);
      await setRole(admin.id, "admin");

      const logs = (await rpcOk(
        app,
        "admin.platformAuditLog",
        {
          limit: 50,
          page: 1,
        },
        admin.cookie
      )) as Array<{ metadata?: unknown }>;

      const serialized = JSON.stringify(logs);
      // Must not contain common secret field names in values
      expect(serialized).not.toContain("password");
      expect(serialized).not.toContain("sessionToken");
      expect(serialized).not.toContain("accessToken");
      expect(serialized).not.toContain("BETTER_AUTH_SECRET");
    });
  });

  describe("Unauthenticated access", () => {
    it("protected procedures return 401 without cookie", async () => {
      const { status } = await rpc(app, "submissions.mySubmissions", {});
      expect(status).toBe(401);
    });

    it("judging procedures return 401 without cookie", async () => {
      const { status } = await rpc(app, "assignments.myAssignments", {
        eventId: "x",
      });
      expect(status).toBe(401);
    });
  });
});
