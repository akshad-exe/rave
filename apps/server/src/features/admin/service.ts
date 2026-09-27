import { writeAudit } from "@rave/api/audit";
import type { ServiceContext } from "@rave/api/context";
import type { AdminService } from "@rave/api/contract";
import { auditLog, user, userProfile } from "@rave/db";
import { and, desc, eq, gte } from "drizzle-orm";

import { assertAuditLogAccess } from "./helpers";

export const adminService: AdminService = {
  // Organizer/Admin: audit log for an event
  async auditLog(ctx: ServiceContext, input) {
    await assertAuditLogAccess(ctx, input.eventId);

    const offset = (input.page - 1) * input.limit;
    const conditions: ReturnType<typeof eq>[] = [
      eq(auditLog.eventId, input.eventId),
    ];
    if (input.since) {
      conditions.push(gte(auditLog.createdAt, new Date(input.since)));
    }

    return ctx.db
      .select()
      .from(auditLog)
      .where(and(...conditions))
      .orderBy(desc(auditLog.createdAt))
      .limit(input.limit)
      .offset(offset);
  },

  // Admin: list all users with roles
  listUsers(ctx: ServiceContext, input) {
    const offset = (input.page - 1) * input.limit;

    return ctx.db
      .select({
        createdAt: user.createdAt,
        email: user.email,
        emailVerified: user.emailVerified,
        id: user.id,
        name: user.name,
        role: userProfile.role,
      })
      .from(user)
      .leftJoin(userProfile, eq(userProfile.userId, user.id))
      .limit(input.limit)
      .offset(offset)
      .orderBy(user.createdAt);
  },

  // Admin: platform-wide audit log
  platformAuditLog(ctx: ServiceContext, input) {
    const offset = (input.page - 1) * input.limit;
    const conditions: ReturnType<typeof eq>[] = [];
    if (input.action) {
      conditions.push(eq(auditLog.action, input.action));
    }

    return ctx.db
      .select()
      .from(auditLog)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(auditLog.createdAt))
      .limit(input.limit)
      .offset(offset);
  },

  // Admin: set user role
  async setRole(ctx: ServiceContext, input) {
    const existing = await ctx.db
      .select({ userId: userProfile.userId })
      .from(userProfile)
      .where(eq(userProfile.userId, input.userId));

    if (existing.length) {
      await ctx.db
        .update(userProfile)
        .set({ role: input.role })
        .where(eq(userProfile.userId, input.userId));
    } else {
      await ctx.db.insert(userProfile).values({
        role: input.role,
        userId: input.userId,
      });
    }

    await writeAudit(ctx, {
      action: "admin.set_role",
      metadata: { role: input.role },
      resourceId: input.userId,
      resourceType: "user",
    });

    return { ok: true };
  },
};
