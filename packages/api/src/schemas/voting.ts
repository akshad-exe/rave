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
  // The one-time code that was delivered to the voter's email. Required so a
  // verification cannot be completed merely by replaying the verificationId
  // the 401 response already returned.
  code: z.string().min(1),
  verificationId: z.string(),
});

export const verificationResponse = z.object({
  // Machine-readable discriminator, so the client can tell a verification
  // challenge apart from any other 401.
  code: z.string().optional(),
  expiresAt: z.date().optional(),
  message: z.string(),
  // The one-time secret. Present only outside production, where there is no
  // mailer to deliver it.
  verificationCode: z.string().optional(),
  verificationId: z.string().optional(),
});
