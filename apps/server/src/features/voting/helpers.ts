import type { ServiceContext } from "@rave/api/context";
import { badRequest, notFound, unauthorized } from "@rave/api/errors";
import { event, votingVerification } from "@rave/db";
import { and, eq, gt } from "drizzle-orm";

export async function assertVotingOpen(
  ctx: ServiceContext,
  eventId: string,
  userId: string
) {
  const rows = await ctx.db
    .select({
      maxVotesPerUser: event.maxVotesPerUser,
      status: event.status,
      votingMode: event.votingMode,
      votingResultsVisible: event.votingResultsVisible,
    })
    .from(event)
    .where(eq(event.id, eventId));

  const [ev] = rows;
  if (!ev) {
    throw notFound("Event not found");
  }

  if (ev.votingMode === "disabled") {
    throw badRequest("Voting is not enabled for this event");
  }

  if (!["submission", "judging", "results"].includes(ev.status)) {
    throw badRequest("Voting is not available in the current event phase");
  }

  if (ev.votingMode === "authenticated" && !userId) {
    throw unauthorized("Must be authenticated to vote");
  }

  if (ev.votingMode === "gated") {
    if (!userId) {
      throw unauthorized("Must be authenticated to vote");
    }
    // Check if user has a valid voting verification token for this event
    const verificationRows = await ctx.db
      .select({ id: votingVerification.id })
      .from(votingVerification)
      .where(
        and(
          eq(votingVerification.userId, userId),
          eq(votingVerification.eventId, eventId),
          eq(votingVerification.verified, 1),
          gt(votingVerification.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!verificationRows.length) {
      throw unauthorized("Email verification required to vote in this event");
    }
  }

  return ev;
}
