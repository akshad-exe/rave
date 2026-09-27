import type { ServiceContext } from "@rave/api/context";
import { forbidden, notFound } from "@rave/api/errors";
import { event, team, teamMember } from "@rave/db";
import { and, count, eq } from "drizzle-orm";

import { requireUserId } from "../../lib/assert";

export const INVITATION_TTL_HOURS = 72;

export async function getEventConfig(ctx: ServiceContext, eventId: string) {
  const rows = await ctx.db
    .select({
      allowIndividuals: event.allowIndividuals,
      maxTeamSize: event.maxTeamSize,
      minTeamSize: event.minTeamSize,
      status: event.status,
    })
    .from(event)
    .where(eq(event.id, eventId));

  const [ev] = rows;
  if (!ev) {
    throw notFound("Event not found");
  }
  return ev;
}

export async function getTeamMemberCount(
  ctx: ServiceContext,
  teamId: string
): Promise<number> {
  const rows = await ctx.db
    .select({ count: count() })
    .from(teamMember)
    .where(eq(teamMember.teamId, teamId));
  return rows[0]?.count ?? 0;
}

export async function assertTeamOwner(ctx: ServiceContext, teamId: string) {
  const userId = requireUserId(ctx);

  const rows = await ctx.db
    .select({ ownerId: team.ownerId })
    .from(team)
    .where(eq(team.id, teamId));

  const [t] = rows;
  if (!t) {
    throw notFound("Team not found");
  }
  if (t.ownerId !== userId) {
    throw forbidden("Not the team owner");
  }
}

export async function assertTeamMember(ctx: ServiceContext, teamId: string) {
  const userId = requireUserId(ctx);

  const rows = await ctx.db
    .select({ userId: teamMember.userId })
    .from(teamMember)
    .where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, userId)));

  if (!rows.length) {
    throw forbidden("Not a member of this team");
  }
}

export async function getUserCurrentTeam(
  ctx: ServiceContext,
  userId: string,
  eventId: string
): Promise<string | null> {
  // Find any team the user is a member of for this event
  const rows = await ctx.db
    .select({ teamId: teamMember.teamId })
    .from(teamMember)
    .innerJoin(team, eq(team.id, teamMember.teamId))
    .where(and(eq(teamMember.userId, userId), eq(team.eventId, eventId)));

  return rows[0]?.teamId ?? null;
}
