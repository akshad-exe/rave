import { writeAudit } from "@rave/api/audit";
import type { TeamsService } from "@rave/api/contract";
import { badRequest, conflict, gone, notFound } from "@rave/api/errors";
import { generateId, generateToken } from "@rave/api/id";
import { team, teamInvitation, teamMember } from "@rave/db";
import { and, desc, eq } from "drizzle-orm";

import { requireRow, requireUserId } from "../../lib/assert";
import {
  assertTeamMember,
  assertTeamOwner,
  getEventConfig,
  getTeamMemberCount,
  getUserCurrentTeam,
  INVITATION_TTL_HOURS,
} from "./helpers";

export const teamsService: TeamsService = {
  // Accept invitation by token
  async acceptInvitation(ctx, input) {
    const userId = requireUserId(ctx);

    const rows = await ctx.db
      .select()
      .from(teamInvitation)
      .where(eq(teamInvitation.token, input.token));

    const [inv] = rows;
    if (!inv) {
      throw notFound("Invitation not found");
    }

    if (inv.status !== "pending") {
      throw gone(`Invitation is ${inv.status}`);
    }

    if (inv.expiresAt < new Date()) {
      await ctx.db
        .update(teamInvitation)
        .set({ status: "expired" })
        .where(eq(teamInvitation.id, inv.id));
      throw gone("Invitation has expired");
    }

    // Check user is not already in a team for this event
    const existing = await getUserCurrentTeam(ctx, userId, inv.eventId);
    if (existing) {
      throw conflict("Already a member of a team for this event");
    }

    const ev = await getEventConfig(ctx, inv.eventId);
    const memberCount = await getTeamMemberCount(ctx, inv.teamId);
    if (memberCount >= ev.maxTeamSize) {
      throw badRequest("Team is already at maximum size");
    }

    // Atomic: join team + update invitation
    await ctx.db.transaction(async (tx) => {
      await tx.insert(teamMember).values({ teamId: inv.teamId, userId });
      await tx
        .update(teamInvitation)
        .set({
          invitedUserId: userId,
          respondedAt: new Date(),
          status: "accepted",
        })
        .where(eq(teamInvitation.id, inv.id));
    });

    await writeAudit(ctx, {
      action: "team.invitation_accepted",
      eventId: inv.eventId,
      metadata: { invitationId: inv.id },
      resourceId: inv.teamId,
      resourceType: "team",
    });

    return { teamId: inv.teamId };
  },

  // Create a team for an event
  async create(ctx, input) {
    const userId = requireUserId(ctx);
    const ev = await getEventConfig(ctx, input.eventId);

    if (!["registration", "submission"].includes(ev.status)) {
      throw badRequest(
        "Teams can only be created during registration or submission phases"
      );
    }

    // User must not already be in a team for this event
    const existing = await getUserCurrentTeam(ctx, userId, input.eventId);
    if (existing) {
      throw conflict("Already a member of a team for this event");
    }

    const teamId = generateId("team");
    await ctx.db.transaction(async (tx) => {
      await tx.insert(team).values({
        description: input.description,
        eventId: input.eventId,
        id: teamId,
        name: input.name,
        ownerId: userId,
      });

      await tx.insert(teamMember).values({
        teamId,
        userId,
      });
    });

    await writeAudit(ctx, {
      action: "team.create",
      eventId: input.eventId,
      metadata: { name: input.name },
      resourceId: teamId,
      resourceType: "team",
    });

    const rows = await ctx.db.select().from(team).where(eq(team.id, teamId));
    return requireRow(rows, "Team not found");
  },

  // Create an invitation link
  async createInvitation(ctx, input) {
    const userId = requireUserId(ctx);
    await assertTeamOwner(ctx, input.teamId);

    const rows = await ctx.db
      .select({ eventId: team.eventId, name: team.name })
      .from(team)
      .where(eq(team.id, input.teamId));

    const [t] = rows;
    if (!t) {
      throw notFound("Team not found");
    }

    // Check team is not full
    const ev = await getEventConfig(ctx, t.eventId);
    const memberCount = await getTeamMemberCount(ctx, input.teamId);
    if (memberCount >= ev.maxTeamSize) {
      throw badRequest("Team is already at maximum size");
    }

    const token = generateToken();
    const expiresAt = new Date(
      Date.now() + INVITATION_TTL_HOURS * 60 * 60 * 1000
    );

    const id = generateId("inv");
    await ctx.db.insert(teamInvitation).values({
      eventId: t.eventId,
      expiresAt,
      id,
      invitedByUserId: userId,
      invitedEmail: input.invitedEmail,
      teamId: input.teamId,
      token,
    });

    return { expiresAt, invitationId: id, token };
  },

  // Get team details with member count
  async get(ctx, input) {
    const rows = await ctx.db
      .select()
      .from(team)
      .where(eq(team.id, input.teamId));

    const [t] = rows;
    if (!t) {
      throw notFound("Team not found");
    }

    const members = await ctx.db
      .select({ joinedAt: teamMember.joinedAt, userId: teamMember.userId })
      .from(teamMember)
      .where(eq(teamMember.teamId, input.teamId));

    return { ...t, members };
  },

  // Leave a team
  async leave(ctx, input) {
    const userId = requireUserId(ctx);
    await assertTeamMember(ctx, input.teamId);

    const rows = await ctx.db
      .select({ eventId: team.eventId, ownerId: team.ownerId })
      .from(team)
      .where(eq(team.id, input.teamId));

    const [t] = rows;
    if (!t) {
      throw notFound("Team not found");
    }

    if (t.ownerId === userId) {
      throw badRequest(
        "Team owner cannot leave. Transfer ownership or delete the team."
      );
    }

    await ctx.db
      .delete(teamMember)
      .where(
        and(eq(teamMember.teamId, input.teamId), eq(teamMember.userId, userId))
      );

    await writeAudit(ctx, {
      action: "team.leave",
      eventId: t.eventId,
      resourceId: input.teamId,
      resourceType: "team",
    });

    return { ok: true };
  },

  // Get teams for an event (public basic info)
  listByEvent(ctx, input) {
    return ctx.db
      .select({
        description: team.description,
        eventId: team.eventId,
        id: team.id,
        name: team.name,
        ownerId: team.ownerId,
      })
      .from(team)
      .where(eq(team.eventId, input.eventId));
  },

  // Revoke invitation (owner only)
  async listInvitations(ctx, input) {
    await assertTeamOwner(ctx, input.teamId);

    return ctx.db
      .select()
      .from(teamInvitation)
      .where(eq(teamInvitation.teamId, input.teamId))
      .orderBy(desc(teamInvitation.createdAt));
  },

  // My team for an event
  async myTeam(ctx, input) {
    const userId = requireUserId(ctx);
    const teamId = await getUserCurrentTeam(ctx, userId, input.eventId);
    if (!teamId) {
      return null;
    }

    const rows = await ctx.db.select().from(team).where(eq(team.id, teamId));

    const [t] = rows;
    if (!t) {
      return null;
    }

    const members = await ctx.db
      .select({ joinedAt: teamMember.joinedAt, userId: teamMember.userId })
      .from(teamMember)
      .where(eq(teamMember.teamId, teamId));

    return { ...t, members };
  },

  // Remove a member (owner only)
  async removeMember(ctx, input) {
    await assertTeamOwner(ctx, input.teamId);

    const [teamRow] = await ctx.db
      .select({ eventId: team.eventId, ownerId: team.ownerId })
      .from(team)
      .where(eq(team.id, input.teamId));

    if (!teamRow) {
      throw notFound("Team not found");
    }
    if (input.userId === ctx.session?.user?.id) {
      throw badRequest("Owner cannot remove themselves");
    }

    await ctx.db
      .delete(teamMember)
      .where(
        and(
          eq(teamMember.teamId, input.teamId),
          eq(teamMember.userId, input.userId)
        )
      );

    await writeAudit(ctx, {
      action: "team.remove_member",
      eventId: teamRow.eventId,
      metadata: { removedUserId: input.userId },
      resourceId: input.teamId,
      resourceType: "team",
    });

    return { ok: true };
  },

  async revokeInvitation(ctx, input) {
    const rows = await ctx.db
      .select()
      .from(teamInvitation)
      .where(eq(teamInvitation.id, input.invitationId));

    const [inv] = rows;
    if (!inv) {
      throw notFound("Invitation not found");
    }

    await assertTeamOwner(ctx, inv.teamId);

    await ctx.db
      .update(teamInvitation)
      .set({ respondedAt: new Date(), status: "revoked" })
      .where(eq(teamInvitation.id, input.invitationId));

    return { ok: true };
  },

  // Update team name/description (owner only)
  async update(ctx, input) {
    const { teamId, ...fields } = input;
    await assertTeamOwner(ctx, teamId);

    await ctx.db
      .update(team)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(team.id, teamId));

    const rows = await ctx.db.select().from(team).where(eq(team.id, teamId));
    return requireRow(rows, "Team not found");
  },
};
