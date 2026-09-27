import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const auditLog = pgTable(
  "audit_log",
  {
    action: text("action").notNull(),
    actorId: text("actor_id"),
    actorRole: text("actor_role"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    eventId: text("event_id"),
    id: text("id").primaryKey(),
    ipAddress: text("ip_address"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    resourceId: text("resource_id"),
    resourceType: text("resource_type").notNull(),
    userAgent: text("user_agent"),
  },
  (t) => [
    index("audit_log_actor_idx").on(t.actorId),
    index("audit_log_event_idx").on(t.eventId),
    index("audit_log_action_idx").on(t.action),
    index("audit_log_resource_idx").on(t.resourceType, t.resourceId),
    index("audit_log_created_at_idx").on(t.createdAt),
  ]
);
