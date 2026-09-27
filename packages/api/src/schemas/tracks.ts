import { z } from "zod";

export const createTrackInput = z.object({
  description: z.string().max(2000).optional(),
  eventId: z.string(),
  maxSubmissions: z.number().int().positive().optional(),
  name: z.string().min(1).max(120),
  sortOrder: z.number().int().default(0),
});

export const updateTrackInput = z.object({
  description: z.string().max(2000).optional(),
  maxSubmissions: z.number().int().positive().nullable().optional(),
  name: z.string().min(1).max(120).optional(),
  sortOrder: z.number().int().optional(),
  trackId: z.string(),
});

export const trackIdInput = z.object({ trackId: z.string() });

export const eventIdInput = z.object({ eventId: z.string() });

export const createPrizeInput = z.object({
  currency: z.string().max(10).default("USD"),
  description: z.string().max(2000).optional(),
  eventId: z.string(),
  name: z.string().min(1).max(120),
  sortOrder: z.number().int().default(0),
  trackId: z.string().optional(),
  value: z.string().max(100).optional(),
});

export const prizeIdInput = z.object({ prizeId: z.string() });
