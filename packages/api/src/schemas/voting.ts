import { z } from "zod";

export const voteInput = z.object({
  eventId: z.string(),
  submissionId: z.string(),
});

export const unvoteInput = z.object({
  eventId: z.string(),
  submissionId: z.string(),
});

export const eventIdInput = z.object({ eventId: z.string() });

export const voteCountsInput = z.object({
  eventId: z.string(),
  submissionId: z.string().optional(),
});

export const createCommentInput = z.object({
  content: z.string().min(1).max(2000),
  submissionId: z.string(),
});

export const commentIdInput = z.object({ commentId: z.string() });

export const listCommentsInput = z.object({
  limit: z.number().int().min(1).max(50).default(20),
  page: z.number().int().min(1).default(1),
  submissionId: z.string(),
});

export const verifyVotingInput = z.object({
  verificationId: z.string(),
});

export const verificationResponse = z.object({
  code: z.string().optional(),
  expiresAt: z.date().optional(),
  message: z.string(),
  verificationId: z.string().optional(),
});
