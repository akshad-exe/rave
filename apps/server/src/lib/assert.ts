import type { ServiceContext } from "@rave/api/context";
import { forbidden, notFound, unauthorized } from "@rave/api/errors";
import { event, eventOrganizer } from "@rave/db";
import { and, eq } from "drizzle-orm";

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
