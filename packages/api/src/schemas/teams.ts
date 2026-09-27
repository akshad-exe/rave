import { z } from "zod";

export const createTeamInput = z.object({
  description: z.string().max(500).optional(),
  eventId: z.string(),
  name: z.string().min(1).max(80),
});

export const updateTeamInput = z.object({
  description: z.string().max(500).optional(),
  name: z.string().min(1).max(80).optional(),
  teamId: z.string(),
});

export const teamIdInput = z.object({ teamId: z.string() });

export const eventIdInput = z.object({ eventId: z.string() });

export const createInvitationInput = z.object({
  invitedEmail: z.email().optional(),
  teamId: z.string(),
});

export const invitationTokenInput = z.object({ token: z.string() });

export const invitationIdInput = z.object({ invitationId: z.string() });

export const removeMemberInput = z.object({
  teamId: z.string(),
  userId: z.string(),
});
