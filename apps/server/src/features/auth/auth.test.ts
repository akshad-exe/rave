import { afterAll, describe, expect, it } from "vitest";
import {
  closeTestApp,
  getTestApp,
  registerUser,
  rpc,
  rpcOk,
  testEmail,
} from "../../tests/helpers";

describe("Authentication", () => {
  const app = getTestApp();

  afterAll(async () => {
    await closeTestApp();
  });

  describe("sign-up", () => {
    it("registers a new user successfully", async () => {
      const email = testEmail();
      const res = await app.inject({
        headers: { "Content-Type": "application/json" },
        method: "POST",
        payload: JSON.stringify({
          email,
          name: "Test User",
          password: "Password123!",
        }),
        url: "/api/auth/sign-up/email",
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.user?.email).toBe(email);
      expect(body.user?.id).toBeTruthy();
      // Password must never appear in response
      expect(JSON.stringify(body)).not.toContain("Password123!");
    });

    it("rejects duplicate email", async () => {
      const email = testEmail();
      await app.inject({
        headers: { "Content-Type": "application/json" },
        method: "POST",
        payload: JSON.stringify({
          email,
          name: "User",
          password: "Password123!",
        }),
        url: "/api/auth/sign-up/email",
      });

      const res = await app.inject({
        headers: { "Content-Type": "application/json" },
        method: "POST",
        payload: JSON.stringify({
          email,
          name: "User2",
          password: "Password123!",
        }),
        url: "/api/auth/sign-up/email",
      });

      expect(res.statusCode).not.toBe(200);
    });

    it("rejects weak password (< 8 chars)", async () => {
      const res = await app.inject({
        headers: { "Content-Type": "application/json" },
        method: "POST",
        payload: JSON.stringify({
          email: testEmail(),
          name: "User",
          password: "short",
        }),
        url: "/api/auth/sign-up/email",
      });
      expect(res.statusCode).not.toBe(200);
    });
  });

  describe("sign-in", () => {
    it("signs in with correct credentials and sets session cookie", async () => {
      const email = testEmail();
      await app.inject({
        headers: { "Content-Type": "application/json" },
        method: "POST",
        payload: JSON.stringify({
          email,
          name: "User",
          password: "Password123!",
        }),
        url: "/api/auth/sign-up/email",
      });

      const res = await app.inject({
        headers: { "Content-Type": "application/json" },
        method: "POST",
        payload: JSON.stringify({ email, password: "Password123!" }),
        url: "/api/auth/sign-in/email",
      });

      expect(res.statusCode).toBe(200);
      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeTruthy();
    });

    it("rejects wrong password with 401", async () => {
      const email = testEmail();
      await app.inject({
        headers: { "Content-Type": "application/json" },
        method: "POST",
        payload: JSON.stringify({
          email,
          name: "User",
          password: "Password123!",
        }),
        url: "/api/auth/sign-up/email",
      });

      const res = await app.inject({
        headers: { "Content-Type": "application/json" },
        method: "POST",
        payload: JSON.stringify({ email, password: "WrongPassword!" }),
        url: "/api/auth/sign-in/email",
      });

      expect(res.statusCode).toBe(401);
      // Response must not leak whether user exists
      const body = JSON.parse(res.body);
      expect(JSON.stringify(body)).not.toContain("WrongPassword!");
    });

    it("rejects non-existent user", async () => {
      const res = await app.inject({
        headers: { "Content-Type": "application/json" },
        method: "POST",
        payload: JSON.stringify({
          email: `nobody-${testEmail()}`,
          password: "Password123!",
        }),
        url: "/api/auth/sign-in/email",
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("session", () => {
    it("unauthenticated request to protected procedure returns 401", async () => {
      const { status } = await rpc(app, "privateData", {});
      expect(status).toBe(401);
    });

    it("authenticated request succeeds", async () => {
      const user = await registerUser(app);
      const result = await rpcOk(app, "privateData", {}, user.cookie);
      expect(result).toBeTruthy();
    });

    it("sign-out invalidates session", async () => {
      const user = await registerUser(app);

      // Verify we can access protected route before sign-out
      const before = await rpc(app, "privateData", {}, user.cookie);
      expect(before.status).toBe(200);

      // Sign out
      const signOutRes = await app.inject({
        headers: { cookie: user.cookie },
        method: "POST",
        url: "/api/auth/sign-out",
      });
      expect(signOutRes.statusCode).toBe(200);

      // After sign-out, same cookie should return 401
      const after = await rpc(app, "privateData", {}, user.cookie);
      expect(after.status).toBe(401);
    });
  });

  describe("health check", () => {
    it("health endpoint returns OK without auth", async () => {
      const result = await rpcOk(app, "healthCheck", {});
      expect(result).toBe("OK");
    });
  });
});
