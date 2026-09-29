import { z } from "zod";

export const eventIdInput = z.object({ eventId: z.string() });

/** One rejected row, reported instead of failing the whole file. */
export const importRowError = z.object({
  field: z.string(),
  message: z.string(),
  row: z.number().int(),
});

export const importResult = z.object({
  created: z.number().int(),
  errors: z.array(importRowError),
  skipped: z.number().int(),
  updated: z.number().int(),
});

const importBase = z.object({
  // Preview without writing: validates every row and reports what would happen.
  dryRun: z.boolean().default(false),
  eventId: z.string(),
});

export const importSubmissionsInput = importBase.extend({
  csv: z.string().min(1),
});

export const importScoresInput = importBase.extend({
  csv: z.string().min(1),
});

export const importTeamsInput = importBase.extend({
  csv: z.string().min(1),
});

export const importAssignmentsInput = importBase.extend({
  csv: z.string().min(1),
});
