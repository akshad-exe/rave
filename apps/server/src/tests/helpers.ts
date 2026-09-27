/**
 * Test helpers: fixture builders, app factory, request wrappers.
 *
 * All tests share a single Fastify app instance per file (via beforeAll/afterAll).
 * Each test gets fresh user/entity state via the helpers below.
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { userProfile } from "@rave/db";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app";
import { db } from "../composition/singletons";
import { createLogger, createLoggerOptions } from "../lib/logger";

// ─── App factory (test mode: no rate limiting) ────────────────────────────────

let _app: FastifyInstance | null = null;

export function getTestApp(): FastifyInstance {
  if (!_app) {
    _app = buildApp({
      logger: createLogger(
        createLoggerOptions({ LOG_LEVEL: "silent", NODE_ENV: "test" })
      ),
      skipRateLimit: true,
    });
  }
  return _app;
}

export async function closeTestApp(): Promise<void> {
  if (_app) {
    await _app.close();
    _app = null;
  }
}

// ─── ID / token helpers ───────────────────────────────────────────────────────

export function uid(): string {
  return randomBytes(8).toString("hex");
}

export function testEmail(): string {
  return `test-${uid()}@rave-test.local`;
}

// ─── User registration helpers ────────────────────────────────────────────────

export interface TestUser {
  cookie: string;
  email: string;
  id: string;
  name: string;
}

/** Register + sign in a user, return id + session cookie. */
export async function registerUser(
  app: FastifyInstance,
  opts: { email?: string; name?: string; password?: string } = {}
): Promise<TestUser> {
  const email = opts.email ?? testEmail();
  const name = opts.name ?? `User-${uid()}`;
  const password = opts.password ?? "Password123!";

  const signUpRes = await app.inject({
    headers: { "Content-Type": "application/json" },
    method: "POST",
    payload: JSON.stringify({ email, name, password }),
    url: "/api/auth/sign-up/email",
  });

  assert(
    signUpRes.statusCode === 200,
    `sign-up failed: ${signUpRes.statusCode} ${signUpRes.body}`
  );

  const signUpBody = JSON.parse(signUpRes.body) as { user?: { id: string } };
  const userId = signUpBody.user?.id;
  assert(userId, "no userId in sign-up response");

  const cookie = extractSessionCookie(signUpRes.headers["set-cookie"]);

  return { cookie, email, id: userId, name };
}

export async function signIn(
  app: FastifyInstance,
  email: string,
  password = "Password123!"
): Promise<string> {
  const res = await app.inject({
    headers: { "Content-Type": "application/json" },
    method: "POST",
    payload: JSON.stringify({ email, password }),
    url: "/api/auth/sign-in/email",
  });
  assert(
    res.statusCode === 200,
    `sign-in failed: ${res.statusCode} ${res.body}`
  );
  return extractSessionCookie(res.headers["set-cookie"]);
}

export function extractSessionCookie(
  setCookie: string | string[] | undefined
): string {
  if (!setCookie) {
    return "";
  }
  const cookies =
    typeof setCookie === "string" ? [setCookie] : (setCookie ?? []);
  const session = cookies.find(
    (c) => c.startsWith("better-auth.session_token") || c.includes("session")
  );
  const withoutAttributes = (cookie: string | undefined): string | undefined =>
    cookie?.split(";")[0];
  return withoutAttributes(session) ?? withoutAttributes(cookies[0]) ?? "";
}

// ─── Role helpers ─────────────────────────────────────────────────────────────

export async function setRole(
  userId: string,
  role: "visitor" | "participant" | "judge" | "organizer" | "admin"
): Promise<void> {
  const existing = await db
    .select({ userId: userProfile.userId })
    .from(userProfile)
    .where(eq(userProfile.userId, userId));

  if (existing.length) {
    await db
      .update(userProfile)
      .set({ role })
      .where(eq(userProfile.userId, userId));
  } else {
    await db.insert(userProfile).values({ role, userId });
  }
}

// ─── oRPC call helper ─────────────────────────────────────────────────────────

export async function rpc(
  app: FastifyInstance,
  procedure: string,
  input: unknown,
  cookie = ""
): Promise<{ status: number; body: unknown }> {
  const { body: resBody, statusCode } = await app.inject({
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    method: "POST",
    payload: JSON.stringify({ json: input }),
    url: `/rpc/${procedure.replaceAll(".", "/")}`,
  });
  let body: unknown;
  try {
    body = JSON.parse(resBody);
  } catch {
    body = resBody;
  }
  return { body, status: statusCode };
}

/** Assert rpc succeeds (2xx) and return output. */
export async function rpcOk(
  app: FastifyInstance,
  procedure: string,
  input: unknown,
  cookie = ""
): Promise<unknown> {
  const { status, body } = await rpc(app, procedure, input, cookie);
  assert(
    status >= 200 && status < 300,
    `${procedure} expected 2xx got ${status}: ${JSON.stringify(body)}`
  );
  const b = body as { json?: unknown };
  return b.json ?? body;
}

/** Assert rpc fails with the given status code. */
export async function rpcFail(
  app: FastifyInstance,
  procedure: string,
  input: unknown,
  expectedStatus: number,
  cookie = ""
): Promise<void> {
  const { status, body } = await rpc(app, procedure, input, cookie);
  assert(
    status === expectedStatus,
    `${procedure} expected ${expectedStatus} got ${status}: ${JSON.stringify(body)}`
  );
}

// ─── Entity fixture helpers ───────────────────────────────────────────────────

export async function createEvent(
  app: FastifyInstance,
  organizerCookie: string,
  overrides: Record<string, unknown> = {}
): Promise<{ id: string; slug: string }> {
  const slug = `test-event-${uid()}`;
  const result = await rpcOk(
    app,
    "events.create",
    {
      name: "Test Event",
      slug,
      ...overrides,
    },
    organizerCookie
  );

  const ev = result as { id: string; slug: string };
  return ev;
}

export async function createRubric(
  app: FastifyInstance,
  cookie: string,
  eventId: string
): Promise<{ id: string; criteria: Array<{ id: string }> }> {
  const result = await rpcOk(
    app,
    "rubrics.create",
    {
      criteria: [
        {
          maxScore: 10,
          minScore: 0,
          name: "Innovation",
          sortOrder: 0,
          weight: 50,
        },
        {
          maxScore: 10,
          minScore: 0,
          name: "Execution",
          sortOrder: 1,
          weight: 50,
        },
      ],
      eventId,
      isWeighted: true,
      name: "Test Rubric",
    },
    cookie
  );

  return result as { id: string; criteria: Array<{ id: string }> };
}

export async function createTeamAndSubmission(
  app: FastifyInstance,
  participantCookie: string,
  eventId: string
): Promise<{ teamId: string; submissionId: string }> {
  // Create team
  const teamResult = await rpcOk(
    app,
    "teams.create",
    {
      eventId,
      name: `Team-${uid()}`,
    },
    participantCookie
  );

  const teamData = teamResult as { id: string };

  // Create submission
  const subResult = await rpcOk(
    app,
    "submissions.create",
    {
      eventId,
      name: `Project-${uid()}`,
      tagline: "A test project",
      teamId: teamData.id,
    },
    participantCookie
  );

  const subData = subResult as { id: string };

  return { submissionId: subData.id, teamId: teamData.id };
}
