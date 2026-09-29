import { protectedProcedure, publicProcedure } from "../index";
import {
  createInvitationInput,
  createTeamInput,
  eventIdInput,
  invitationIdInput,
  invitationTokenInput,
  removeMemberInput,
  teamIdInput,
  updateTeamInput,
} from "../schemas/teams";

export const teamsRouter = {
  // Accept invitation by token
  acceptInvitation: protectedProcedure
    .route({
      method: "POST",
      path: "/teams/invitations/accept",
      summary: "Accept a team invitation by token",
      tags: ["Teams"],
    })
    .input(invitationTokenInput)
    .handler(({ context, input }) =>
      context.services.teams.acceptInvitation(context, input)
    ),

  // Create a team for an event
  create: protectedProcedure
    .route({
      method: "POST",
      path: "/events/{eventId}/teams",
      summary: "Create a team for an event",
      tags: ["Teams"],
    })
    .input(createTeamInput)
    .handler(({ context, input }) =>
      context.services.teams.create(context, input)
    ),

  // Create an invitation link
  createInvitation: protectedProcedure
    .route({
      method: "POST",
      path: "/teams/{teamId}/invitations",
      summary: "Create an invitation link for a team",
      tags: ["Teams"],
    })
    .input(createInvitationInput)
    .handler(({ context, input }) =>
      context.services.teams.createInvitation(context, input)
    ),

  // Get team details with member count
  get: publicProcedure
    .route({
      method: "GET",
      path: "/teams/{teamId}",
      summary: "Get team details with member count",
      tags: ["Teams"],
    })
    .input(teamIdInput)
    .handler(({ context, input }) =>
      context.services.teams.get(context, input)
    ),

  // Leave a team
  leave: protectedProcedure
    .route({
      method: "POST",
      path: "/teams/{teamId}/leave",
      summary: "Leave a team",
      tags: ["Teams"],
    })
    .input(teamIdInput)
    .handler(({ context, input }) =>
      context.services.teams.leave(context, input)
    ),

  // Get teams for an event (public basic info)
  listByEvent: publicProcedure
    .route({
      method: "GET",
      path: "/events/{eventId}/teams",
      summary: "List teams for an event",
      tags: ["Teams"],
    })
    .input(eventIdInput)
    .handler(({ context, input }) =>
      context.services.teams.listByEvent(context, input)
    ),

  // Revoke invitation (owner only)
  // Team owner: invitations this team has issued, so a leaked link can be found
  listInvitations: protectedProcedure
    .route({
      method: "GET",
      path: "/teams/{teamId}/invitations",
      summary: "List invitations issued by this team",
      tags: ["Teams"],
    })
    .input(teamIdInput)
    .handler(({ context, input }) =>
      context.services.teams.listInvitations(context, input)
    ),

  // My team for an event
  myTeam: protectedProcedure
    .route({
      method: "GET",
      path: "/events/{eventId}/teams/my",
      summary: "Get my team for an event",
      tags: ["Teams"],
    })
    .input(eventIdInput)
    .handler(({ context, input }) =>
      context.services.teams.myTeam(context, input)
    ),

  // Remove a member (owner only)
  removeMember: protectedProcedure
    .route({
      method: "DELETE",
      path: "/teams/{teamId}/members/{userId}",
      summary: "Remove a member from a team",
      tags: ["Teams"],
    })
    .input(removeMemberInput)
    .handler(({ context, input }) =>
      context.services.teams.removeMember(context, input)
    ),

  revokeInvitation: protectedProcedure
    .route({
      method: "POST",
      path: "/teams/invitations/{invitationId}/revoke",
      summary: "Revoke a team invitation",
      tags: ["Teams"],
    })
    .input(invitationIdInput)
    .handler(({ context, input }) =>
      context.services.teams.revokeInvitation(context, input)
    ),

  // Update team name/description (owner only)
  update: protectedProcedure
    .route({
      method: "PATCH",
      path: "/teams/{teamId}",
      summary: "Update team name/description",
      tags: ["Teams"],
    })
    .input(updateTeamInput)
    .handler(({ context, input }) =>
      context.services.teams.update(context, input)
    ),
};
