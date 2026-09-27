import { z } from "zod";

export const submissionInputBase = z.object({
  customAnswers: z
    .array(z.object({ answer: z.string().max(5000), questionId: z.string() }))
    .default([]),
  demoVideoUrl: z.url().optional(),
  description: z.string().max(20_000).optional(),
  galleryImageUrls: z.array(z.url()).max(10).default([]),
  liveDemoUrl: z.url().optional(),
  name: z.string().min(1).max(120),
  repositoryUrl: z.url().optional(),
  tagline: z.string().max(200).optional(),
  techTags: z.array(z.string().max(50)).max(20).default([]),
  thumbnailUrl: z.url().optional(),
  trackId: z.string().optional(),
});

export const createSubmissionInput = submissionInputBase.extend({
  eventId: z.string(),
  teamId: z.string().optional(),
});

export const updateSubmissionInput = submissionInputBase.partial().extend({
  submissionId: z.string(),
});

export const submissionIdInput = z.object({ submissionId: z.string() });

export const eventIdInput = z.object({ eventId: z.string() });

export const mySubmissionsInput = z.object({ eventId: z.string().optional() });

export const disqualifySubmissionInput = z.object({
  reason: z.string().max(500).optional(),
  submissionId: z.string(),
});

export const galleryInput = z.object({
  eventId: z.string(),
  limit: z.number().int().min(1).max(100).default(20),
  page: z.number().int().min(1).default(1),
  search: z.string().optional(),
  sortBy: z.enum(["recent", "name"]).default("recent"),
  techTag: z.string().optional(),
  trackId: z.string().optional(),
});
