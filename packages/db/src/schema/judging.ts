import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { event, track } from "./events";
import { submission } from "./submissions";

export const assignmentStatusEnum = pgEnum("assignment_status", [
  "pending",
  "in_progress",
  "completed",
  "skipped",
]);

export const rubric = pgTable(
  "rubric",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    description: text("description"),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    id: text("id").primaryKey(),
    // If true, weights must sum to 100
    isWeighted: boolean("is_weighted").notNull().default(true),
    name: text("name").notNull(),
    trackId: text("track_id").references(() => track.id, {
      onDelete: "cascade",
    }),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("rubric_event_idx").on(t.eventId)]
);

export const rubricCriterion = pgTable(
  "rubric_criterion",
  {
    description: text("description"),
    id: text("id").primaryKey(),
    maxScore: integer("max_score").notNull().default(10),
    minScore: integer("min_score").notNull().default(0),
    name: text("name").notNull(),
    rubricId: text("rubric_id")
      .notNull()
      .references(() => rubric.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    weight: numeric("weight", { precision: 5, scale: 2 }).notNull(),
  },
  (t) => [index("rubric_criterion_rubric_idx").on(t.rubricId)]
);

export const judgeAssignment = pgTable(
  "judge_assignment",
  {
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    id: text("id").primaryKey(),
    judgeId: text("judge_id").notNull(),
    status: assignmentStatusEnum("status").notNull().default("pending"),
    submissionId: text("submission_id")
      .notNull()
      .references(() => submission.id, { onDelete: "cascade" }),
    trackId: text("track_id").references(() => track.id, {
      onDelete: "set null",
    }),
  },
  (t) => [
    // A judge can only be assigned to a submission once
    unique("judge_assignment_unique").on(t.judgeId, t.submissionId),
    index("judge_assignment_event_idx").on(t.eventId),
    index("judge_assignment_judge_idx").on(t.judgeId),
    index("judge_assignment_submission_idx").on(t.submissionId),
  ]
);

export const score = pgTable(
  "score",
  {
    assignmentId: text("assignment_id")
      .notNull()
      .references(() => judgeAssignment.id, { onDelete: "cascade" }),

    // Criterion scores stored as JSONB: {criterionId, score}[]
    criterionScores: jsonb("criterion_scores")
      .$type<Array<{ criterionId: string; score: number }>>()
      .notNull(),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),

    feedback: text("feedback"),
    id: text("id").primaryKey(),
    isLocked: boolean("is_locked").notNull().default(false),
    judgeId: text("judge_id").notNull(),
    rubricId: text("rubric_id")
      .notNull()
      .references(() => rubric.id, { onDelete: "restrict" }),
    submissionId: text("submission_id")
      .notNull()
      .references(() => submission.id, { onDelete: "cascade" }),
    submittedAt: timestamp("submitted_at").defaultNow().notNull(),

    // Computed weighted total (stored for performance)
    totalScore: numeric("total_score", { precision: 8, scale: 4 }),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    // One score record per assignment
    unique("score_assignment_unique").on(t.assignmentId),
    index("score_judge_idx").on(t.judgeId),
    index("score_submission_idx").on(t.submissionId),
    index("score_event_idx").on(t.eventId),
  ]
);

export const result = pgTable(
  "result",
  {
    computedAt: timestamp("computed_at").defaultNow().notNull(),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    finalScore: numeric("final_score", { precision: 8, scale: 4 }),
    id: text("id").primaryKey(),
    normalizedScore: numeric("normalized_score", { precision: 8, scale: 4 }),
    publishedAt: timestamp("published_at"),
    rank: integer("rank"),

    rawScore: numeric("raw_score", { precision: 8, scale: 4 }),

    // Snapshot of criteria breakdown
    scoreBreakdown:
      jsonb("score_breakdown").$type<
        Array<{
          criterionId: string;
          name: string;
          averageScore: number;
          weight: number;
        }>
      >(),
    submissionId: text("submission_id")
      .notNull()
      .references(() => submission.id, { onDelete: "cascade" }),
    trackId: text("track_id").references(() => track.id, {
      onDelete: "set null",
    }),
    trackRank: integer("track_rank"),
  },
  (t) => [
    unique("result_event_submission_unique").on(t.eventId, t.submissionId),
    index("result_event_idx").on(t.eventId),
    index("result_rank_idx").on(t.eventId, t.rank),
  ]
);
