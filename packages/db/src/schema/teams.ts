import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { event } from "./events";

export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "declined",
  "revoked",
  "expired",
]);

export const team = pgTable(
  "team",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    description: text("description"),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    ownerId: text("owner_id").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("team_event_idx").on(t.eventId),
    index("team_owner_idx").on(t.ownerId),
  ]
);

export const teamMember = pgTable(
  "team_member",
  {
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
    teamId: text("team_id")
      .notNull()
      .references(() => team.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
  },
  (t) => [
    unique("team_member_unique").on(t.teamId, t.userId),
    index("team_member_team_idx").on(t.teamId),
    index("team_member_user_idx").on(t.userId),
  ]
);

export const teamInvitation = pgTable(
  "team_invitation",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    id: text("id").primaryKey(),
    invitedByUserId: text("invited_by_user_id").notNull(),
    invitedEmail: text("invited_email"),
    invitedUserId: text("invited_user_id"),
    respondedAt: timestamp("responded_at"),
    status: invitationStatusEnum("status").notNull().default("pending"),
    teamId: text("team_id")
      .notNull()
      .references(() => team.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
  },
  (t) => [
    index("team_invitation_team_idx").on(t.teamId),
    index("team_invitation_token_idx").on(t.token),
    index("team_invitation_invited_user_idx").on(t.invitedUserId),
  ]
);
