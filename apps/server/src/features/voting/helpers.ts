import type { ServiceContext } from "@rave/api/context";
import { badRequest, notFound, unauthorized } from "@rave/api/errors";
import { event } from "@rave/db";
import { eq } from "drizzle-orm";

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

  if (ev.votingMode === "gated" && !userId) {
    // Only the identity check belongs here. Whether this voter holds a verified
    // token is decided where the vote is recorded, because that is the only
    // place that can mint the challenge the client needs to respond to. Doing
    // it here too shadowed that path behind a bare 401 the UI could not act on.
    throw unauthorized("Must be authenticated to vote");
  }

  return ev;
}
