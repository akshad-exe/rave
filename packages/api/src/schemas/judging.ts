import { z } from "zod";

export const criterionInput = z.object({
  description: z.string().max(500).optional(),
  maxScore: z.number().int().min(1).default(10),
  minScore: z.number().int().min(0).default(0),
  name: z.string().min(1).max(120),
  sortOrder: z.number().int().default(0),
  weight: z.number().min(0).max(100),
});

export const createRubricInput = z.object({
  criteria: z.array(criterionInput).min(1).max(20),
  description: z.string().max(2000).optional(),
  eventId: z.string(),
  isWeighted: z.boolean().default(true),
  name: z.string().min(1).max(120),
  trackId: z.string().optional(),
});

export const rubricIdInput = z.object({ rubricId: z.string() });

export const eventIdInput = z.object({ eventId: z.string() });

export const assignJudgeInput = z.object({
  eventId: z.string(),
  judgeId: z.string(),
  submissionId: z.string(),
});

export const batchAssignInput = z.object({
  eventId: z.string(),
  judgeIds: z.array(z.string()).min(1),
  submissionsPerJudge: z.number().int().min(1).max(50).default(5),
  trackId: z.string().optional(),
});

export const assignmentIdInput = z.object({ assignmentId: z.string() });

export const submitScoreInput = z.object({
  assignmentId: z.string(),
  criterionScores: z.array(
    z.object({
      criterionId: z.string(),
      score: z.number(),
    })
  ),
  feedback: z.string().max(5000).optional(),
  rubricId: z.string(),
});
