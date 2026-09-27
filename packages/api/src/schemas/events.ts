import { z } from "zod";

export const eventStatusValues = [
  "draft",
  "registration",
  "submission",
  "judging",
  "results",
  "archived",
] as const;

export const eventStatusEnum = z.enum(eventStatusValues);

export const customQuestionSchema = z.object({
  id: z.string(),
  label: z.string().max(200),
  required: z.boolean(),
  type: z.enum(["text", "url", "textarea"]),
});

export const createEventInput = z.object({
  allowIndividuals: z.boolean().default(true),
  coverImageUrl: z.url().optional(),
  customQuestions: z.array(customQuestionSchema).default([]),
  description: z.string().max(10_000).optional(),
  endDate: z.iso.datetime().optional(),
  isPublic: z.boolean().default(false),
  judgingEndAt: z.iso.datetime().optional(),
  judgingStartAt: z.iso.datetime().optional(),
  maxTeamSize: z.number().int().min(1).max(20).default(4),
  maxVotesPerUser: z.number().int().min(1).max(50).default(3),
  minTeamSize: z.number().int().min(1).default(1),
  name: z.string().min(3).max(120),
  registrationEndAt: z.iso.datetime().optional(),
  registrationStartAt: z.iso.datetime().optional(),
  slug: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
  startDate: z.iso.datetime().optional(),
  submissionDeadline: z.iso.datetime().optional(),
  submissionStartAt: z.iso.datetime().optional(),
  tagline: z.string().max(200).optional(),
  votingMode: z.enum(["disabled", "open", "authenticated"]).default("disabled"),
  websiteUrl: z.url().optional(),
});

export const updateEventInput = createEventInput.partial().extend({
  eventId: z.string(),
});

export const eventIdInput = z.object({ eventId: z.string() });

export const transitionEventInput = z.object({
  eventId: z.string(),
  status: eventStatusEnum,
});

export const listEventsInput = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  page: z.number().int().min(1).default(1),
  search: z.string().optional(),
  status: eventStatusEnum.optional(),
});
