/**
 * RBAC tests — verify role enforcement at the API level.
 * Tests actual HTTP procedures, not just helper functions.
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

describe("RBAC — Role-Based Access Control", () => {
  const app = getTestApp();

  afterAll(async () => {
    await closeTestApp();
  });

  describe("Visitor role", () => {
    it("visitor cannot create an event", async () => {
      const user = await registerUser(app);
      await setRole(user.id, "visitor");
      const { status } = await rpc(
        app,
        "events.create",
        {
          name: "Hack",
          slug: `visitor-event-${Date.now()}`,
        },
        user.cookie
      );
      expect(status).toBe(403);
    });

    it("visitor cannot access admin routes", async () => {
      const user = await registerUser(app);
      await setRole(user.id, "visitor");
      const { status } = await rpc(
        app,
        "admin.listUsers",
        { limit: 10, page: 1 },
        user.cookie
      );
      expect(status).toBe(403);
    });
  });

  describe("Participant role", () => {
    it("participant cannot create an event", async () => {
      const user = await registerUser(app);
      // Default role is participant
      const { status } = await rpc(
        app,
        "events.create",
        {
          name: "Hack",
          slug: `participant-event-${Date.now()}`,
        },
        user.cookie
      );
      expect(status).toBe(403);
    });

    it("participant cannot access admin route", async () => {
      const user = await registerUser(app);
      const { status } = await rpc(
        app,
        "admin.listUsers",
        { limit: 10, page: 1 },
        user.cookie
      );
      expect(status).toBe(403);
    });

    it("participant cannot set user roles", async () => {
      const user = await registerUser(app);
      const target = await registerUser(app);
      const { status } = await rpc(
        app,
        "admin.setRole",
        {
          role: "admin",
          userId: target.id,
        },
        user.cookie
      );
      expect(status).toBe(403);
    });
  });

  describe("Judge role", () => {
    it("judge cannot access organizer admin operations", async () => {
      const judge = await registerUser(app);
      await setRole(judge.id, "judge");

      const { status } = await rpc(
        app,
        "admin.listUsers",
        { limit: 10, page: 1 },
        judge.cookie
      );
      expect(status).toBe(403);
    });

    it("judge cannot create events", async () => {
      const judge = await registerUser(app);
      await setRole(judge.id, "judge");

      const { status } = await rpc(
        app,
        "events.create",
        {
          name: "Hack",
          slug: `judge-event-${Date.now()}`,
        },
        judge.cookie
      );
      expect(status).toBe(403);
    });
  });

  describe("Organizer role", () => {
    it("organizer can create an event", async () => {
      const org = await registerUser(app);
      await setRole(org.id, "organizer");
      const result = await rpcOk(
        app,
        "events.create",
        {
          name: "Org Event",
          slug: `org-event-${Date.now()}`,
        },
        org.cookie
      );
      expect(result).toBeTruthy();
    });

    it("organizer cannot access admin routes", async () => {
      const org = await registerUser(app);
      await setRole(org.id, "organizer");
      const { status } = await rpc(
        app,
        "admin.listUsers",
        { limit: 10, page: 1 },
        org.cookie
      );
      expect(status).toBe(403);
    });

    it("organizer cannot update another organizer's event", async () => {
      const org1 = await registerUser(app);
      await setRole(org1.id, "organizer");
      const org2 = await registerUser(app);
      await setRole(org2.id, "organizer");

      const ev = await createEvent(app, org1.cookie);

      // org2 tries to update org1's event
      const { status } = await rpc(
        app,
        "events.update",
        {
          eventId: ev.id,
          name: "Hijacked",
        },
        org2.cookie
      );
      expect(status).toBe(403);
    });
  });

  describe("Admin role", () => {
    it("admin can list users", async () => {
      const admin = await registerUser(app);
      await setRole(admin.id, "admin");
      const result = await rpcOk(
        app,
        "admin.listUsers",
        { limit: 10, page: 1 },
        admin.cookie
      );
      expect(Array.isArray(result)).toBe(true);
    });

    it("admin can set roles", async () => {
      const admin = await registerUser(app);
      await setRole(admin.id, "admin");
      const target = await registerUser(app);

      await rpcOk(
        app,
        "admin.setRole",
        {
          role: "organizer",
          userId: target.id,
        },
        admin.cookie
      );
    });
  });
});
