import type { ServiceContext } from "@rave/api/context";
import { badRequest, forbidden, notFound } from "@rave/api/errors";
import { event, submission, teamMember } from "@rave/db";
import { and, eq } from "drizzle-orm";

import { requireUserId } from "../../lib/assert";

// ─── Deadline enforcement ─────────────────────────────────────────────────────

export async function assertSubmissionOpen(
  ctx: ServiceContext,
  eventId: string
): Promise<void> {
  const rows = await ctx.db
    .select({
      status: event.status,
      submissionDeadline: event.submissionDeadline,
      submissionStartAt: event.submissionStartAt,
    })
    .from(event)
    .where(eq(event.id, eventId));

  const [ev] = rows;
  if (!ev) {
    throw notFound("Event not found");
  }

  const now = new Date();

  if (!["submission", "registration"].includes(ev.status)) {
    throw badRequest(
      `Submissions are not open (event is in "${ev.status}" phase)`
    );
  }

  if (ev.submissionDeadline && now > ev.submissionDeadline) {
    throw badRequest("Submission deadline has passed");
  }

  if (ev.submissionStartAt && now < ev.submissionStartAt) {
    throw badRequest("Submission window has not opened yet");
  }
}

// ─── Ownership ────────────────────────────────────────────────────────────────

export async function assertSubmissionOwner(
  ctx: ServiceContext,
  submissionId: string
) {
  const userId = requireUserId(ctx);

  const rows = await ctx.db
    .select({
      eventId: submission.eventId,
      status: submission.status,
      submitterId: submission.submitterId,
      teamId: submission.teamId,
    })
    .from(submission)
    .where(eq(submission.id, submissionId));

  const [sub] = rows;
  if (!sub) {
    throw notFound("Submission not found");
  }

  // Direct submitter
  if (sub.submitterId === userId) {
    return sub;
  }

  // Team member
  if (sub.teamId) {
    const memberRows = await ctx.db
      .select({ userId: teamMember.userId })
      .from(teamMember)
      .where(
        and(eq(teamMember.teamId, sub.teamId), eq(teamMember.userId, userId))
      );
    if (memberRows.length) {
      return sub;
    }
  }

  throw forbidden("Not the owner of this submission");
}
