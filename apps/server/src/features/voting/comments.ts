import type { CommentsService } from "@rave/api/contract";
import { badRequest, forbidden, notFound } from "@rave/api/errors";
import { generateId } from "@rave/api/id";
import { comment, event, eventOrganizer, submission } from "@rave/db";
import { and, eq } from "drizzle-orm";

import { requireRow, requireUserId } from "../../lib/assert";

export const commentsService: CommentsService = {
  // Create comment
  async create(ctx, input) {
    const userId = requireUserId(ctx);

    const subRows = await ctx.db
      .select({ eventId: submission.eventId, status: submission.status })
      .from(submission)
      .where(eq(submission.id, input.submissionId));

    const [sub] = subRows;
    if (!sub) {
      throw notFound("Submission not found");
    }
    if (sub.status === "draft") {
      throw badRequest("Cannot comment on a draft submission");
    }

    const id = generateId("cmt");
    await ctx.db.insert(comment).values({
      authorId: userId,
      content: input.content,
      eventId: sub.eventId,
      id,
      submissionId: input.submissionId,
    });

    const rows = await ctx.db.select().from(comment).where(eq(comment.id, id));
    return requireRow(rows, "Comment not found");
  },

  // Delete comment (owner or organizer)
  async delete(ctx, input) {
    const userId = requireUserId(ctx);

    const rows = await ctx.db
      .select()
      .from(comment)
      .where(eq(comment.id, input.commentId));

    const [commentRow] = rows;
    if (!commentRow) {
      throw notFound("Comment not found");
    }

    // Allow author to delete their own comment
    if (commentRow.authorId !== userId) {
      // Check if organizer of the event
      const evRows = await ctx.db
        .select({ organizerId: event.organizerId })
        .from(event)
        .where(eq(event.id, commentRow.eventId));

      const [ev] = evRows;
      if (!ev) {
        throw notFound("Event not found");
      }

      if (ev.organizerId !== userId) {
        const co = await ctx.db
          .select({ userId: eventOrganizer.userId })
          .from(eventOrganizer)
          .where(
            and(
              eq(eventOrganizer.eventId, commentRow.eventId),
              eq(eventOrganizer.userId, userId)
            )
          );
        if (!co.length) {
          throw forbidden("Cannot delete this comment");
        }
      }
    }

    await ctx.db
      .update(comment)
      .set({
        deletedAt: new Date(),
        deletedByUserId: userId,
        isDeleted: 1,
        updatedAt: new Date(),
      })
      .where(eq(comment.id, input.commentId));

    return { ok: true };
  },

  // List comments for a submission
  async list(ctx, input) {
    const offset = (input.page - 1) * input.limit;

    const rows = await ctx.db
      .select({
        authorId: comment.authorId,
        content: comment.content,
        createdAt: comment.createdAt,
        id: comment.id,
        isDeleted: comment.isDeleted,
      })
      .from(comment)
      .where(eq(comment.submissionId, input.submissionId))
      .orderBy(comment.createdAt)
      .limit(input.limit)
      .offset(offset);

    return rows.map((r) => ({
      ...r,
      content: r.isDeleted ? "[deleted]" : r.content,
    }));
  },
};
