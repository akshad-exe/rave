import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { event, track } from "./events";
import { team } from "./teams";

export const submissionStatusEnum = pgEnum("submission_status", [
  "draft",
  "submitted",
  "locked",
  "disqualified",
]);

export const submission = pgTable(
  "submission",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),

    // Answers to organizer custom questions: {questionId, answer}[]
    customAnswers: jsonb("custom_answers")
      .$type<Array<{ questionId: string; answer: string }>>()
      .notNull()
      .default([]),
    demoVideoUrl: text("demo_video_url"),
    description: text("description"),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    galleryImageUrls: jsonb("gallery_image_urls")
      .$type<string[]>()
      .notNull()
      .default([]),
    id: text("id").primaryKey(),
    liveDemoUrl: text("live_demo_url"),
    lockedAt: timestamp("locked_at"),

    // Project fields
    name: text("name").notNull(),
    repositoryUrl: text("repository_url"),

    status: submissionStatusEnum("status").notNull().default("draft"),

    submittedAt: timestamp("submitted_at"),
    // Solo submitter (when no team)
    submitterId: text("submitter_id").notNull(),
    tagline: text("tagline"),
    teamId: text("team_id").references(() => team.id, { onDelete: "set null" }),

    // Arrays stored as JSONB for simplicity
    techTags: jsonb("tech_tags").$type<string[]>().notNull().default([]),
    thumbnailUrl: text("thumbnail_url"),
    trackId: text("track_id").references(() => track.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("submission_event_idx").on(t.eventId),
    index("submission_team_idx").on(t.teamId),
    index("submission_submitter_idx").on(t.submitterId),
    index("submission_track_idx").on(t.trackId),
    index("submission_status_idx").on(t.status),
    // Each team can only have one submission per event
    unique("submission_team_event_unique").on(t.teamId, t.eventId),
  ]
);
