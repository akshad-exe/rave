import { os } from "@orpc/server";
import { eq } from "drizzle-orm";

import type { Context } from "./context";
import { forbidden, unauthorized } from "./errors";

export const o = os.$context<Context>();

export const publicProcedure = o;

// ─── Auth middleware ───────────────────────────────────────────────────────────

const requireAuthMiddleware = o.middleware(({ context, next }) => {
  if (!context.session?.user) {
    throw unauthorized();
  }
  return next({
    context: { session: context.session },
  });
});

export const protectedProcedure = publicProcedure.use(requireAuthMiddleware);

// ─── Role middleware ───────────────────────────────────────────────────────────

type UserRole = "visitor" | "participant" | "judge" | "organizer" | "admin";

const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 4,
  judge: 2,
  organizer: 3,
  participant: 1,
  visitor: 0,
};

/**
 * Resolve the current user's role from the database.
 * Returns 'participant' as default if no profile row exists.
 */
async function resolveRole(context: Context): Promise<UserRole> {
  if (!context.session?.user) {
    return "visitor";
  }

  const { db } = context;
  // Lazy import to avoid circular deps at module level
  const { userProfile } = await import("@rave/db");
  const rows = await db
    .select({ role: userProfile.role })
    .from(userProfile)
    .where(eq(userProfile.userId, context.session.user.id));

  return (rows[0]?.role as UserRole | undefined) ?? "participant";
}

/** Require at least `role` in the hierarchy. */
export function requireRole(...roles: UserRole[]) {
  return o.middleware(async ({ context, next }) => {
    if (!context.session?.user) {
      throw unauthorized();
    }

    const userRole = await resolveRole(context);
    const allowed = roles.some(
      (r) => ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[r]
    );
    if (!allowed) {
      throw forbidden(`Requires one of: ${roles.join(", ")}`);
    }
    return next({ context: { session: context.session, userRole } });
  });
}

/** Require exactly one of the listed roles. */
export function requireAnyRole(...roles: UserRole[]) {
  return o.middleware(async ({ context, next }) => {
    if (!context.session?.user) {
      throw unauthorized();
    }

    const userRole = await resolveRole(context);
    if (!roles.includes(userRole)) {
      throw forbidden(`Requires one of: ${roles.join(", ")}`);
    }
    return next({ context: { session: context.session, userRole } });
  });
}

export const adminProcedure = protectedProcedure.use(requireRole("admin"));

export const organizerProcedure = protectedProcedure.use(
  requireRole("organizer")
);
