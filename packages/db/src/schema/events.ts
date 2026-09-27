import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const eventStatusEnum = pgEnum("event_status", [
  "draft",
  "registration",
  "submission",
  "judging",
  "results",
  "archived",
]);

export const votingModeEnum = pgEnum("voting_mode", [
  "disabled",
  "open",
  "authenticated",
]);

export const event = pgTable(
  "event",
  {
    allowIndividuals: boolean("allow_individuals").notNull().default(true),
    coverImageUrl: text("cover_image_url"),

    createdAt: timestamp("created_at").defaultNow().notNull(),

    // Custom fields schema stored as JSONB array of {id, label, type, required}
    customQuestions: jsonb("custom_questions")
      .$type<
        Array<{
          id: string;
          label: string;
          type: "text" | "url" | "textarea";
          required: boolean;
        }>
      >()
      .notNull()
      .default([]),
    description: text("description"),
    endDate: timestamp("end_date"),
    id: text("id").primaryKey(),
    isPublic: boolean("is_public").notNull().default(false),
    judgingEndAt: timestamp("judging_end_at"),

    // Judging
    judgingResultsVisible: boolean("judging_results_visible")
      .notNull()
      .default(false),
    judgingStartAt: timestamp("judging_start_at"),

    // Config
    maxTeamSize: integer("max_team_size").notNull().default(4),
    maxVotesPerUser: integer("max_votes_per_user").notNull().default(3),
    minTeamSize: integer("min_team_size").notNull().default(1),
    name: text("name").notNull(),
    organizerId: text("organizer_id").notNull(),
    registrationEndAt: timestamp("registration_end_at"),

    // Timeline
    registrationStartAt: timestamp("registration_start_at"),
    requireEmailVerification: boolean("require_email_verification")
      .notNull()
      .default(false),
    resultsPublishedAt: timestamp("results_published_at"),
    slug: text("slug").notNull().unique(),
    startDate: timestamp("start_date"),
    status: eventStatusEnum("status").notNull().default("draft"),
    submissionDeadline: timestamp("submission_deadline"),
    submissionStartAt: timestamp("submission_start_at"),
    tagline: text("tagline"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),

    // Voting
    votingMode: votingModeEnum("voting_mode").notNull().default("disabled"),
    votingResultsVisible: boolean("voting_results_visible")
      .notNull()
      .default(false),
    websiteUrl: text("website_url"),
  },
  (t) => [
    index("event_slug_idx").on(t.slug),
    index("event_organizer_idx").on(t.organizerId),
    index("event_status_idx").on(t.status),
  ]
);

export const track = pgTable(
  "track",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    description: text("description"),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    id: text("id").primaryKey(),
    maxSubmissions: integer("max_submissions"),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("track_event_idx").on(t.eventId)]
);

export const prize = pgTable(
  "prize",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    currency: text("currency").default("USD"),
    description: text("description"),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    trackId: text("track_id").references(() => track.id, {
      onDelete: "set null",
    }),
    value: text("value"),
  },
  (t) => [index("prize_event_idx").on(t.eventId)]
);

// Event organizer/admin memberships (organizer can add co-organizers)
export const eventOrganizer = pgTable(
  "event_organizer",
  {
    addedAt: timestamp("added_at").defaultNow().notNull(),
    canManageJudges: boolean("can_manage_judges").notNull().default(true),
    canManageSubmissions: boolean("can_manage_submissions")
      .notNull()
      .default(true),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
  },
  (t) => [
    index("event_organizer_event_idx").on(t.eventId),
    index("event_organizer_user_idx").on(t.userId),
  ]
);
