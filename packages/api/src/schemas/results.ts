import { z } from "zod";

export const computeResultsInput = z.object({
  eventId: z.string(),
  rubricId: z.string(),
  trackId: z.string().optional(),
  useNormalization: z.boolean().default(true),
});

export const adminResultsInput = z.object({
  eventId: z.string(),
  trackId: z.string().optional(),
});

export const publishedResultsInput = z.object({
  eventId: z.string(),
  limit: z.number().int().min(1).max(100).default(20),
  page: z.number().int().min(1).default(1),
  trackId: z.string().optional(),
});
