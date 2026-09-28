import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { event } from "./events";
import { submission } from "./submissions";

export const vote = pgTable(
  "vote",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    id: text("id").primaryKey(),
    submissionId: text("submission_id")
      .notNull()
      .references(() => submission.id, { onDelete: "cascade" }),
    voterId: text("voter_id").notNull(),
  },
  (t) => [
    // Each voter can only vote for a submission once per event
    unique("vote_voter_submission_unique").on(t.voterId, t.submissionId),
    index("vote_event_idx").on(t.eventId),
    index("vote_submission_idx").on(t.submissionId),
    index("vote_voter_event_idx").on(t.voterId, t.eventId),
  ]
);

export const comment = pgTable(
  "comment",
  {
    authorId: text("author_id").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
    deletedByUserId: text("deleted_by_user_id"),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    id: text("id").primaryKey(),
    isDeleted: integer("is_deleted").notNull().default(0),
    submissionId: text("submission_id")
      .notNull()
      .references(() => submission.id, { onDelete: "cascade" }),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("comment_submission_idx").on(t.submissionId),
    index("comment_author_idx").on(t.authorId),
    index("comment_event_idx").on(t.eventId),
  ]
);

// Email verification tokens for gated voting
export const votingVerification = pgTable(
  "voting_verification",
  {
    // One-time code delivered to the voter's email. Held server-side so a
    // verification cannot be completed just by replaying the verificationId
    // the 401 already handed back.
    code: text("code"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    email: text("email").notNull(),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    id: text("id").primaryKey(),
    submissionId: text("submission_id")
      .notNull()
      .references(() => submission.id, { onDelete: "cascade" }),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    verified: integer("verified").notNull().default(0),
  },
  (t) => [
    index("voting_verification_user_event_idx").on(t.userId, t.eventId),
    index("voting_verification_email_idx").on(t.email),
    index("voting_verification_expires_idx").on(t.expiresAt),
  ]
);

// Per-voter ballot ordering seeds for randomised but stable ballot order
export const ballotSeed = pgTable(
  "ballot_seed",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    id: text("id").primaryKey(),
    seed: integer("seed").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [
    unique("ballot_seed_user_event_unique").on(t.userId, t.eventId),
    index("ballot_seed_event_idx").on(t.eventId),
    index("ballot_seed_user_idx").on(t.userId),
  ]
);
