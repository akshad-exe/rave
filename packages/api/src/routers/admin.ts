import { adminProcedure, protectedProcedure } from "../index";
import {
  auditLogInput,
  listUsersInput,
  platformAuditLogInput,
  setRoleInput,
} from "../schemas/admin";

export const adminRouter = {
  // Organizer/Admin: audit log for an event
  auditLog: protectedProcedure
    .route({
      method: "GET",
      path: "/admin/audit-log",
      summary: "Audit log for an event",
      tags: ["Admin"],
    })
    .input(auditLogInput)
    .handler(({ context, input }) =>
      context.services.admin.auditLog(context, input)
    ),

  // Admin: list all users with roles
  listUsers: adminProcedure
    .route({
      method: "GET",
      path: "/admin/users",
      summary: "List all users with roles",
      tags: ["Admin"],
    })
    .input(listUsersInput)
    .handler(({ context, input }) =>
      context.services.admin.listUsers(context, input)
    ),

  // Admin: platform-wide audit log
  platformAuditLog: adminProcedure
    .route({
      method: "GET",
      path: "/admin/audit-log/platform",
      summary: "Platform-wide audit log",
      tags: ["Admin"],
    })
    .input(platformAuditLogInput)
    .handler(({ context, input }) =>
      context.services.admin.platformAuditLog(context, input)
    ),

  // Admin: set user role
  setRole: adminProcedure
    .route({
      method: "PUT",
      path: "/admin/users/{userId}/role",
      summary: "Set a user's role",
      tags: ["Admin"],
    })
    .input(setRoleInput)
    .handler(({ context, input }) =>
      context.services.admin.setRole(context, input)
    ),
};
