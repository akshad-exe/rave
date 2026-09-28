import { protectedProcedure, publicProcedure } from "../index";
import {
  commentIdInput,
  createCommentInput,
  eventIdInput,
  listCommentsInput,
  unvoteInput,
  verifyVotingInput,
  voteCountsInput,
  voteInput,
} from "../schemas/voting";

export const votingRouter = {
  // Get vote counts for an event (respects visibility)
  counts: publicProcedure
    .route({
      method: "GET",
      path: "/events/{eventId}/votes",
      summary: "Get vote counts for an event",
      tags: ["Voting"],
    })
    .input(voteCountsInput)
    .handler(({ context, input }) =>
      context.services.voting.counts(context, input)
    ),

  // My votes for an event
  myVotes: protectedProcedure
    .route({
      method: "GET",
      path: "/events/{eventId}/votes/my",
      summary: "Get my votes for an event",
      tags: ["Voting"],
    })
    .input(eventIdInput)
    .handler(({ context, input }) =>
      context.services.voting.myVotes(context, input)
    ),

  // Remove a vote
  unvote: protectedProcedure
    .route({
      method: "DELETE",
      path: "/events/{eventId}/votes/{submissionId}",
      summary: "Remove a vote",
      tags: ["Voting"],
    })
    .input(unvoteInput)
    .handler(({ context, input }) =>
      context.services.voting.unvote(context, input)
    ),

  // Verify voting email
  verifyVoting: protectedProcedure
    .route({
      method: "POST",
      path: "/voting/verify",
      summary: "Verify email for gated voting",
      tags: ["Voting"],
    })
    .input(verifyVotingInput)
    .handler(({ context, input }) =>
      context.services.voting.verifyVoting(context, input)
    ),

  // Cast a vote
  vote: protectedProcedure
    .route({
      method: "POST",
      path: "/events/{eventId}/votes",
      summary: "Cast a vote",
      tags: ["Voting"],
    })
    .input(voteInput)
    .handler(({ context, input }) =>
      context.services.voting.vote(context, input)
    ),
};

export const commentsRouter = {
  // Create comment
  create: protectedProcedure
    .route({
      method: "POST",
      path: "/submissions/{submissionId}/comments",
      summary: "Create a comment on a submission",
      tags: ["Comments"],
    })
    .input(createCommentInput)
    .handler(({ context, input }) =>
      context.services.comments.create(context, input)
    ),

  // Delete comment (owner or organizer)
  delete: protectedProcedure
    .route({
      method: "DELETE",
      path: "/comments/{commentId}",
      summary: "Delete a comment",
      tags: ["Comments"],
    })
    .input(commentIdInput)
    .handler(({ context, input }) =>
      context.services.comments.delete(context, input)
    ),

  // List comments for a submission
  list: publicProcedure
    .route({
      method: "GET",
      path: "/submissions/{submissionId}/comments",
      summary: "List comments for a submission",
      tags: ["Comments"],
    })
    .input(listCommentsInput)
    .handler(({ context, input }) =>
      context.services.comments.list(context, input)
    ),
};
