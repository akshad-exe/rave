import { writeAudit } from "@rave/api/audit";
import type { VotingService } from "@rave/api/contract";
import {
  badRequest,
  conflict,
  forbidden,
  isUniqueViolation,
  notFound,
  unauthorized,
} from "@rave/api/errors";
import { generateId } from "@rave/api/id";
import { event, submission, user, vote, votingVerification } from "@rave/db";
import { and, count, eq, gt } from "drizzle-orm";

import { requireUserId } from "../../lib/assert";
import { assertVotingOpen } from "./helpers";

const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

export const votingService: VotingService = {
  // Get vote counts for an event (respects visibility)
  async counts(ctx, input) {
    const evRows = await ctx.db
      .select({
        organizerId: event.organizerId,
        votingResultsVisible: event.votingResultsVisible,
      })
      .from(event)
      .where(eq(event.id, input.eventId));

    const [ev] = evRows;
    if (!ev) {
      throw notFound("Event not found");
    }

    const userId = ctx.session?.user?.id;

    if (!ev.votingResultsVisible && userId !== ev.organizerId) {
      throw forbidden("Voting results are not yet visible");
    }

    const conditions = [eq(vote.eventId, input.eventId)];
    if (input.submissionId) {
      conditions.push(eq(vote.submissionId, input.submissionId));
    }

    const rows = await ctx.db
      .select({ cnt: count(), submissionId: vote.submissionId })
      .from(vote)
      .where(and(...conditions))
      .groupBy(vote.submissionId);

    return rows.map((r) => {
      const votes = Number(r.cnt);
      return {
        influence: Math.sqrt(votes),
        submissionId: r.submissionId,
        votes,
      };
    });
  },

  // My votes for an event
  myVotes(ctx, input) {
    const userId = requireUserId(ctx);
    return ctx.db
      .select({ createdAt: vote.createdAt, submissionId: vote.submissionId })
      .from(vote)
      .where(and(eq(vote.voterId, userId), eq(vote.eventId, input.eventId)));
  },

  // Remove a vote
  async unvote(ctx, input) {
    const userId = requireUserId(ctx);

    const rows = await ctx.db
      .select({ id: vote.id })
      .from(vote)
      .where(
        and(
          eq(vote.voterId, userId),
          eq(vote.submissionId, input.submissionId),
          eq(vote.eventId, input.eventId)
        )
      );

    const [existingVote] = rows;
    if (!existingVote) {
      throw notFound("Vote not found");
    }

    await ctx.db.delete(vote).where(eq(vote.id, existingVote.id));
    return { ok: true };
  },

  // Verify voting email
  async verifyVoting(ctx, input) {
    const userId = requireUserId(ctx);

    const verificationRows = await ctx.db
      .select()
      .from(votingVerification)
      .where(
        and(
          eq(votingVerification.id, input.verificationId),
          eq(votingVerification.userId, userId),
          gt(votingVerification.expiresAt, new Date())
        )
      )
      .limit(1);

    const [verification] = verificationRows;
    if (!verification) {
      throw notFound("Verification token not found or expired");
    }

    if (verification.verified === 1) {
      throw badRequest("Verification token already used");
    }

    await ctx.db
      .update(votingVerification)
      .set({ updatedAt: new Date(), verified: 1 })
      .where(eq(votingVerification.id, input.verificationId));

    await writeAudit(ctx, {
      action: "vote.verify",
      eventId: verification.eventId,
      metadata: { submissionId: verification.submissionId },
      resourceId: input.verificationId,
      resourceType: "voting_verification",
    });

    return { ok: true };
  },

  // Cast a vote
  async vote(ctx, input) {
    const userId = requireUserId(ctx);
    const ev = await assertVotingOpen(ctx, input.eventId, userId);

    // Check submission exists and is submitted
    const subRows = await ctx.db
      .select({ eventId: submission.eventId, status: submission.status })
      .from(submission)
      .where(eq(submission.id, input.submissionId));

    const [sub] = subRows;
    if (!sub) {
      throw notFound("Submission not found");
    }
    if (sub.eventId !== input.eventId) {
      throw badRequest("Submission not in this event");
    }
    if (sub.status !== "submitted") {
      throw badRequest("Can only vote for submitted projects");
    }

    // Check vote limit per user per event
    const userVoteCount = await ctx.db
      .select({ cnt: count() })
      .from(vote)
      .where(and(eq(vote.voterId, userId), eq(vote.eventId, input.eventId)));

    if (Number(userVoteCount[0]?.cnt ?? 0) >= ev.maxVotesPerUser) {
      throw badRequest(
        `Maximum of ${ev.maxVotesPerUser} votes per user for this event`
      );
    }

    // For gated voting, check if user has valid verification
    if (ev.votingMode === "gated") {
      const verificationRows = await ctx.db
        .select({ id: votingVerification.id })
        .from(votingVerification)
        .where(
          and(
            eq(votingVerification.userId, userId),
            eq(votingVerification.eventId, input.eventId),
            eq(votingVerification.verified, 1),
            gt(votingVerification.expiresAt, new Date())
          )
        )
        .limit(1);

      if (!verificationRows.length) {
        // Create a new verification token
        const verificationId = generateId("vvf");
        const expiresAt = new Date();
        expiresAt.setHours(
          expiresAt.getHours() + VERIFICATION_TOKEN_EXPIRY_HOURS
        );

        // Get user email
        const userRows = await ctx.db
          .select({ email: user.email })
          .from(user)
          .where(eq(user.id, userId));

        const [userRecord] = userRows;
        if (!userRecord) {
          throw notFound("User not found");
        }

        await ctx.db.insert(votingVerification).values({
          email: userRecord.email,
          eventId: input.eventId,
          expiresAt,
          id: verificationId,
          submissionId: input.submissionId,
          userId,
          verified: 0,
        });

        throw unauthorized({
          code: "VERIFICATION_REQUIRED",
          expiresAt,
          message: "Email verification required",
          verificationId,
        });
      }
    }

    const voteId = generateId("vot");
    try {
      await ctx.db.insert(vote).values({
        eventId: input.eventId,
        id: voteId,
        submissionId: input.submissionId,
        voterId: userId,
      });
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        throw conflict("Already voted for this submission");
      }
      throw err;
    }

    await writeAudit(ctx, {
      action: "vote.cast",
      eventId: input.eventId,
      metadata: { submissionId: input.submissionId },
      resourceId: voteId,
      resourceType: "vote",
    });

    return { ok: true };
  },
};
