import type { AuthInstance } from "@rave/auth";

import { SEED_PASSWORD, type SeedAccounts } from "./seed";

/** Request header values ready to paste into `.dogfood.toml`. */
export interface SeededCredentials {
  judgeA: string;
  judgeB: string;
  organizer: string;
  participant: string;
}

/**
 * Turns a Better Auth `Set-Cookie` value into a request `Cookie` header.
 *
 * Everything after the first `;` is cookie attributes (`Path`, `HttpOnly`,
 * `SameSite`, ...) which belong on a response, not on a request.
 */
function toCookieHeader(setCookie: string | null | undefined): string {
  const pair = setCookie?.split(";")[0]?.trim();
  if (!pair) {
    throw new Error("Better Auth did not return a session cookie");
  }
  return `Cookie: ${pair}`;
}

/**
 * Signs in as each acceptance role and returns the resulting cookies.
 *
 * Signing in through Better Auth, rather than writing session rows by hand,
 * guarantees each cookie is signed with the running server's secret and will
 * actually authenticate against it.
 *
 * Signing in mints a new session each call and deliberately leaves existing
 * ones in place: a re-seed or a server restart must not sign the demo users out
 * of the web app, and a cookie printed by an earlier boot stays valid. The
 * extra sessions age out with Better Auth's own expiry.
 *
 * @param auth - Configured Better Auth instance
 * @param accounts - The four seeded acceptance accounts
 * @returns One `Cookie:` header per role
 */
export async function issueCredentialHeaders(
  auth: AuthInstance,
  accounts: SeedAccounts
): Promise<SeededCredentials> {
  const byRole = {
    judgeA: accounts.judgeA,
    judgeB: accounts.judgeB,
    organizer: accounts.organizer,
    participant: accounts.participant,
  };

  const entries = await Promise.all(
    Object.entries(byRole).map(async ([role, account]) => {
      const result = (await auth.api.signInEmail({
        asResponse: true,
        body: { email: account.email, password: SEED_PASSWORD },
      })) as Response;

      return [role, toCookieHeader(result.headers.get("set-cookie"))] as const;
    })
  );

  return Object.fromEntries(entries) as unknown as SeededCredentials;
}
