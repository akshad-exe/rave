import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { Database } from "@rave/db";
import { account, session, user, verification } from "@rave/db/schema/auth";
import { betterAuth } from "better-auth";

export interface AuthConfig {
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  CORS_ORIGIN: string;
  NODE_ENV?: string;
}

export interface BetterAuthLoggerConfig {
  disableColors?: boolean;
  disabled?: boolean;
  level?: "debug" | "error" | "info" | "warn";
  log?: (
    level: "debug" | "error" | "info" | "warn",
    message: string,
    ...args: unknown[]
  ) => void;
}

export function createAuth(
  env: AuthConfig,
  database: Database,
  desktopOrigins: readonly string[] = [],
  loggerConfig?: BetterAuthLoggerConfig
) {
  const isProd = env.NODE_ENV === "production";

  return betterAuth({
    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        // sameSite lax is correct for same-site deployments; only use none for cross-site
        sameSite: isProd ? "lax" : "none",
        secure: isProd,
      },
    },
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(database, {
      provider: "pg",
      schema: {
        account,
        session,
        user,
        verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      maxPasswordLength: 128,
      // Minimum 8-char password enforced by better-auth
      minPasswordLength: 8,
    },
    rateLimit: {
      enabled: env.NODE_ENV !== "test",
      max: 10,
      // 10 auth attempts per 10 seconds per IP
      window: 10,
    },
    session: {
      // Sessions expire after 30 days by default; revoke on password change
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24, // refresh session every day
    },
    ...(loggerConfig ? { logger: loggerConfig } : {}),
    plugins: [],
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.CORS_ORIGIN, ...desktopOrigins],
  });
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
