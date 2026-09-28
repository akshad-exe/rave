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

/**
 * Field shapes with no defaults.
 *
 * `createEventInput` layers defaults on top, but `updateEventInput` must NOT
 * inherit them: a defaulted field inside a `.partial()` still resolves to its
 * default when the client omits the key, so an update that only meant to change
 * one field silently reset every other default — including `isPublic`, which
 * turned a public event private.
 */
const eventFields = {
  allowIndividuals: z.boolean(),
  coverImageUrl: z.url().optional(),
  customQuestions: z.array(customQuestionSchema),
  description: z.string().max(10_000).optional(),
  endDate: z.iso.datetime().optional(),
  isPublic: z.boolean(),
  judgingEndAt: z.iso.datetime().optional(),
  judgingStartAt: z.iso.datetime().optional(),
  maxTeamSize: z.number().int().min(1).max(20),
  maxVotesPerUser: z.number().int().min(1).max(50),
  minTeamSize: z.number().int().min(1),
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
  // "gated" must stay in step with votingModeEnum in packages/db, which already
  // stores it. Without it here the API rejects any event configured for gated
  // voting, even though the service layer handles the mode.
  votingMode: z.enum(["disabled", "open", "authenticated", "gated"]),
  websiteUrl: z.url().optional(),
};

export const createEventInput = z.object({
  ...eventFields,
  allowIndividuals: eventFields.allowIndividuals.default(true),
  customQuestions: eventFields.customQuestions.default([]),
  isPublic: eventFields.isPublic.default(false),
  maxTeamSize: eventFields.maxTeamSize.default(4),
  maxVotesPerUser: eventFields.maxVotesPerUser.default(3),
  minTeamSize: eventFields.minTeamSize.default(1),
  votingMode: eventFields.votingMode.default("disabled"),
});

/**
 * Partial update, built from the default-free shapes on purpose. See the note on
 * eventFields: inheriting `.default()` here would let an omitted key overwrite
 * the stored value with its default.
 */
export const updateEventInput = z.object(eventFields).partial().extend({
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
