import { z } from "zod";

export const userRoleEnum = z.enum([
  "visitor",
  "participant",
  "judge",
  "organizer",
  "admin",
]);

export const auditLogInput = z.object({
  eventId: z.string(),
  limit: z.number().int().min(1).max(100).default(50),
  page: z.number().int().min(1).default(1),
  since: z.iso.datetime().optional(),
});

export const listUsersInput = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  page: z.number().int().min(1).default(1),
});

export const platformAuditLogInput = z.object({
  action: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  page: z.number().int().min(1).default(1),
});

export const setRoleInput = z.object({
  role: userRoleEnum,
  userId: z.string(),
});
