import type { ServiceContext } from "@rave/api/context";
import { forbidden, notFound } from "@rave/api/errors";
import { event, userProfile } from "@rave/db";
import { eq } from "drizzle-orm";

import { requireUserId } from "../../lib/assert";

export async function assertAuditLogAccess(
  ctx: ServiceContext,
  eventId: string
): Promise<void> {
  const userId = requireUserId(ctx);
  const evRows = await ctx.db
    .select({ organizerId: event.organizerId })
    .from(event)
    .where(eq(event.id, eventId));

  const [ev] = evRows;
  if (!ev) {
    throw notFound("Event not found");
  }

  if (ev.organizerId !== userId) {
    const profileRows = await ctx.db
      .select({ role: userProfile.role })
      .from(userProfile)
      .where(eq(userProfile.userId, userId));

    if (profileRows[0]?.role !== "admin") {
      throw forbidden("Not authorized to view audit log");
    }
  }
}
