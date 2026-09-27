import type { ServiceContext } from "@rave/api/context";
import { forbidden, notFound, unauthorized } from "@rave/api/errors";
import { event, eventOrganizer, userProfile } from "@rave/db";
import { and, eq } from "drizzle-orm";

export type UserRole =
  | "admin"
  | "judge"
  | "organizer"
  | "participant"
  | "visitor";

/** Return the first row of a select, throwing `notFound` if missing. */
export function requireRow<T>(rows: T[], message: string): T {
  const [row] = rows;
  if (!row) {
    throw notFound(message);
  }
  return row;
}

/** Throw an `unauthorized` unless a session user exists; return their id. */
export function requireUserId(ctx: ServiceContext): string {
  const userId = ctx.session?.user?.id;
  if (!userId) {
    throw unauthorized();
  }
  return userId;
}

/**
 * Resolve the current user's role from `user_profile`.
 *
 * Defaults to `participant`, matching the column default, for users who exist
 * without a profile row.
 */
export async function resolveRole(ctx: ServiceContext): Promise<UserRole> {
  const userId = ctx.session?.user?.id;
  if (!userId) {
    return "visitor";
  }

  const rows = await ctx.db
    .select({ role: userProfile.role })
    .from(userProfile)
    .where(eq(userProfile.userId, userId));

  return (rows[0]?.role as UserRole | undefined) ?? "participant";
}

/**
 * Require one exact role and return the caller's user id.
 *
 * Unlike the oRPC `requireRole` middleware, this does not use the role
 * hierarchy. Judge-only views use it so that an organizer's higher rank does
 * not silently grant access to a judge's own-score view.
 */
export async function requireExactRole(
  ctx: ServiceContext,
  role: UserRole
): Promise<string> {
  const userId = requireUserId(ctx);
  const actual = await resolveRole(ctx);

  if (actual !== role) {
    throw forbidden(`Requires the ${role} role`);
  }
  return userId;
}

/** Assert the current user is the event organizer or a co-organizer. */
export async function assertEventOrganizer(
  ctx: ServiceContext,
  eventId: string
): Promise<void> {
  const userId = requireUserId(ctx);

  const rows = await ctx.db
    .select({ organizerId: event.organizerId })
    .from(event)
    .where(eq(event.id, eventId));

  const [ev] = rows;
  if (!ev) {
    throw notFound("Event not found");
  }
  if (ev.organizerId === userId) {
    return;
  }

  const co = await ctx.db
    .select({ userId: eventOrganizer.userId })
    .from(eventOrganizer)
    .where(
      and(
        eq(eventOrganizer.eventId, eventId),
        eq(eventOrganizer.userId, userId)
      )
    );
  if (!co.length) {
    throw forbidden("Not an organizer of this event");
  }
}
