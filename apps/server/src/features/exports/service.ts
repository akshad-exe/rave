import type { ServiceContext } from "@rave/api/context";
import type { ExportsService } from "@rave/api/contract";
import { parseCSVRecordsWithRows, toCSV } from "@rave/api/csv";
import { generateId } from "@rave/api/id";
import type * as exportSchemas from "@rave/api/schemas/exports";
import {
  judgeAssignment,
  result,
  score,
  submission,
  team,
  teamMember,
} from "@rave/db";
import { and, eq } from "drizzle-orm";
import { assertEventOrganizer } from "../../lib/assert";

type ImportSummary = import("zod").infer<typeof exportSchemas.importResult>;

const ASSIGNMENT_STATUSES = ["pending", "in_progress", "completed"] as const;

type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

function toAssignmentStatus(value: string): AssignmentStatus {
  const candidate = value.trim().toLowerCase();
  return (
    ASSIGNMENT_STATUSES.find((status) => status === candidate) ?? "pending"
  );
}

async function teamExists(ctx: ServiceContext, id: string) {
  const rows = await ctx.db
    .select({ id: team.id })
    .from(team)
    .where(eq(team.id, id))
    .limit(1);
  return rows.length > 0;
}

async function assignmentExists(ctx: ServiceContext, id: string) {
  const rows = await ctx.db
    .select({ id: judgeAssignment.id })
    .from(judgeAssignment)
    .where(eq(judgeAssignment.id, id))
    .limit(1);
  return rows.length > 0;
}

function validateTeamRow(
  record: Record<string, string>,
  row: number
): RowError | null {
  const problems: string[] = [];
  if (!field(record, "team_name")) {
    problems.push("team_name is required");
  }
  if (!(field(record, "owner_id") || field(record, "member_user_id"))) {
    problems.push("owner_id or member_user_id is required");
  }
  return problems.length > 0
    ? { field: "row", message: problems.join("; "), row }
    : null;
}

function validateAssignmentRow(
  record: Record<string, string>,
  row: number
): RowError | null {
  const problems: string[] = [];
  if (!field(record, "judge_id")) {
    problems.push("judge_id is required");
  }
  if (!field(record, "submission_id")) {
    problems.push("submission_id is required");
  }
  return problems.length > 0
    ? { field: "row", message: problems.join("; "), row }
    : null;
}

const SUBMISSION_STATUSES = ["draft", "submitted", "locked"] as const;

/**
 * Field lookup that tolerates a CSV missing the column entirely.
 *
 * The parser assigns a string for every column a CSV actually has, but a file
 * can simply omit one, and this repo enables noUncheckedIndexedAccess, so an
 * absent column is genuinely `string | undefined`.
 */
function field(record: Record<string, string>, key: string): string {
  return record[key] ?? "";
}

interface RowError {
  field: string;
  message: string;
  row: number;
}

function toSubmissionStatus(value: string | undefined) {
  const candidate = (value ?? "").trim().toLowerCase();
  return SUBMISSION_STATUSES.find((status) => status === candidate) ?? "draft";
}

async function submissionExists(ctx: ServiceContext, id: string) {
  const rows = await ctx.db
    .select({ id: submission.id })
    .from(submission)
    .where(eq(submission.id, id))
    .limit(1);
  return rows.length > 0;
}

async function scoreExists(ctx: ServiceContext, id: string) {
  const rows = await ctx.db
    .select({ id: score.id })
    .from(score)
    .where(eq(score.id, id))
    .limit(1);
  return rows.length > 0;
}

function validateSubmissionRow(
  record: Record<string, string>,
  row: number
): RowError | null {
  if (!field(record, "name").trim()) {
    return { field: "name", message: "name is required", row };
  }
  return null;
}

function validateScoreRow(
  record: Record<string, string>,
  row: number
): RowError | null {
  const problems: string[] = [];
  if (!field(record, "submission_id").trim()) {
    problems.push("submission_id is required");
  }
  if (!field(record, "judge_id").trim()) {
    problems.push("judge_id is required");
  }
  const rawTotal = field(record, "total_score");
  if (rawTotal && Number.isNaN(Number(rawTotal))) {
    problems.push(`total_score is not a number: ${rawTotal}`);
  }
  return problems.length > 0
    ? { field: "row", message: problems.join("; "), row }
    : null;
}

async function writeSubmissionRow(
  ctx: ServiceContext,
  eventId: string,
  record: Record<string, string>,
  summary: ImportSummary,
  row: number
): Promise<void> {
  const values = {
    eventId,
    liveDemoUrl: field(record, "live_demo_url") || null,
    name: field(record, "name").trim(),
    repositoryUrl: field(record, "repository_url") || null,
    tagline: field(record, "tagline") || null,
    techTags: field(record, "tech_tags")
      .split(";")
      .map((tag) => tag.trim())
      .filter(Boolean),
    // Foreign keys take undefined rather than null when absent.
    trackId: field(record, "track_id") || undefined,
  };

  try {
    if (
      field(record, "id") &&
      (await submissionExists(ctx, field(record, "id")))
    ) {
      await ctx.db
        .update(submission)
        .set(values)
        .where(eq(submission.id, field(record, "id")));
      summary.updated += 1;
      return;
    }
    await ctx.db.insert(submission).values({
      ...values,
      id: field(record, "id") || generateId("sub"),
      // The column is an enum, so a spreadsheet value is narrowed rather than
      // passed through as an arbitrary string.
      status: toSubmissionStatus(field(record, "status")),
      submitterId: field(record, "submitter_id") || "",
      teamId: field(record, "team_id") || undefined,
    });
    summary.created += 1;
  } catch (error) {
    summary.errors.push({
      field: "row",
      message: error instanceof Error ? error.message : "insert failed",
      row,
    });
    summary.skipped += 1;
  }
}

async function writeScoreRow(
  ctx: ServiceContext,
  eventId: string,
  record: Record<string, string>,
  summary: ImportSummary,
  row: number
): Promise<void> {
  const judgeId = field(record, "judge_id");
  const submissionId = field(record, "submission_id");
  const rubricId = field(record, "rubric_id");
  const rawTotal = field(record, "total_score");

  // Scores hang off a judge assignment. If an organizer imports scores before
  // assigning judges there is nothing to attach to, so the row is reported
  // rather than silently dropped.
  const assignment = await findAssignment(ctx, eventId, judgeId, submissionId);
  if (!assignment) {
    summary.errors.push({
      field: "submission_id",
      message:
        "no judge assignment for this judge and submission; assign judges before importing scores",
      row,
    });
    summary.skipped += 1;
    return;
  }

  if (!rubricId) {
    summary.errors.push({
      field: "rubric_id",
      message: "rubric_id is required to record a score",
      row,
    });
    summary.skipped += 1;
    return;
  }

  const values = {
    assignmentId: assignment,
    criterionScores: [] as Array<{ criterionId: string; score: number }>,
    eventId,
    feedback: field(record, "feedback") || null,
    isLocked: field(record, "is_locked") === "true",
    judgeId,
    rubricId,
    submissionId,
    // numeric() is stored as a string, matching how the export renders it.
    totalScore: rawTotal || null,
  };

  try {
    if (
      field(record, "score_id") &&
      (await scoreExists(ctx, field(record, "score_id")))
    ) {
      await ctx.db
        .update(score)
        .set(values)
        .where(eq(score.id, field(record, "score_id")));
      summary.updated += 1;
      return;
    }
    await ctx.db.insert(score).values({
      ...values,
      id: field(record, "score_id") || generateId("sco"),
    });
    summary.created += 1;
  } catch (error) {
    summary.errors.push({
      field: "row",
      message: error instanceof Error ? error.message : "insert failed",
      row,
    });
    summary.skipped += 1;
  }
}

async function findAssignment(
  ctx: ServiceContext,
  eventId: string,
  judgeId: string,
  submissionId: string
): Promise<string | undefined> {
  const [assignment] = await ctx.db
    .select({ id: judgeAssignment.id })
    .from(judgeAssignment)
    .where(
      and(
        eq(judgeAssignment.eventId, eventId),
        eq(judgeAssignment.judgeId, judgeId),
        eq(judgeAssignment.submissionId, submissionId)
      )
    )
    .limit(1);
  return assignment?.id;
}

export const exportsService: ExportsService = {
  // Judge assignments CSV
  async assignments(ctx: ServiceContext, input) {
    await assertEventOrganizer(ctx, input.eventId);

    const rows = await ctx.db
      .select({
        assignedAt: judgeAssignment.assignedAt,
        completedAt: judgeAssignment.completedAt,
        id: judgeAssignment.id,
        judgeId: judgeAssignment.judgeId,
        status: judgeAssignment.status,
        submissionId: judgeAssignment.submissionId,
      })
      .from(judgeAssignment)
      .where(eq(judgeAssignment.eventId, input.eventId));

    const headers = [
      "assignment_id",
      "judge_id",
      "submission_id",
      "status",
      "assigned_at",
      "completed_at",
    ];

    const csvRows = rows.map((r) => [
      r.id,
      r.judgeId,
      r.submissionId,
      r.status,
      r.assignedAt.toISOString(),
      r.completedAt?.toISOString(),
    ]);

    return { csv: toCSV(headers, csvRows) };
  },

  async importAssignments(ctx: ServiceContext, input) {
    await assertEventOrganizer(ctx, input.eventId);

    const summary: ImportSummary = {
      created: 0,
      errors: [],
      skipped: 0,
      updated: 0,
    };

    for (const { record, row } of parseCSVRecordsWithRows(input.csv)) {
      const problem = validateAssignmentRow(record, row);
      if (problem) {
        summary.errors.push(problem);
        summary.skipped += 1;
        continue;
      }

      if (input.dryRun) {
        const existingId = field(record, "assignment_id");
        // biome-ignore lint/performance/noAwaitInLoops: per-row existence check, kept sequential so errors are reported in spreadsheet order
        if (existingId && (await assignmentExists(ctx, existingId))) {
          summary.updated += 1;
        } else {
          summary.created += 1;
        }
        continue;
      }

      try {
        const values = {
          eventId: input.eventId,
          judgeId: field(record, "judge_id"),
          status: toAssignmentStatus(field(record, "status")),
          submissionId: field(record, "submission_id"),
          trackId: field(record, "track_id") || undefined,
        };
        const assignmentId = field(record, "assignment_id");

        if (assignmentId && (await assignmentExists(ctx, assignmentId))) {
          await ctx.db
            .update(judgeAssignment)
            .set(values)
            .where(eq(judgeAssignment.id, assignmentId));
          summary.updated += 1;
        } else {
          await ctx.db.insert(judgeAssignment).values({
            ...values,
            id: assignmentId || generateId("asg"),
          });
          summary.created += 1;
        }
      } catch (error) {
        summary.errors.push({
          field: "row",
          message: error instanceof Error ? error.message : "insert failed",
          row,
        });
        summary.skipped += 1;
      }
    }

    return summary;
  },

  async importScores(ctx: ServiceContext, input) {
    await assertEventOrganizer(ctx, input.eventId);

    const summary: ImportSummary = {
      created: 0,
      errors: [],
      skipped: 0,
      updated: 0,
    };

    for (const { record, row } of parseCSVRecordsWithRows(input.csv)) {
      const problem = validateScoreRow(record, row);
      if (problem) {
        summary.errors.push(problem);
        summary.skipped += 1;
        continue;
      }

      if (input.dryRun) {
        if (
          field(record, "score_id") &&
          // biome-ignore lint/performance/noAwaitInLoops: per-row existence check, kept sequential so errors are reported in spreadsheet order
          (await scoreExists(ctx, field(record, "score_id")))
        ) {
          summary.updated += 1;
        } else {
          summary.created += 1;
        }
        continue;
      }

      await writeScoreRow(ctx, input.eventId, record, summary, row);
    }

    return summary;
  },
  // ─── Bulk import ────────────────────────────────────────────────────────────
  // The mirror of the exports above, so an organizer's own data round-trips:
  // export, edit in a spreadsheet, import back. A row is keyed on its `id`
  // column, so re-importing the same file updates rather than duplicates, and
  // bad rows are reported individually instead of failing the whole file.

  async importSubmissions(ctx: ServiceContext, input) {
    await assertEventOrganizer(ctx, input.eventId);

    const summary: ImportSummary = {
      created: 0,
      errors: [],
      skipped: 0,
      updated: 0,
    };

    for (const { record, row } of parseCSVRecordsWithRows(input.csv)) {
      const problem = validateSubmissionRow(record, row);
      if (problem) {
        summary.errors.push(problem);
        summary.skipped += 1;
        continue;
      }

      if (input.dryRun) {
        if (
          field(record, "id") &&
          // biome-ignore lint/performance/noAwaitInLoops: per-row existence check, kept sequential so errors are reported in spreadsheet order
          (await submissionExists(ctx, field(record, "id")))
        ) {
          summary.updated += 1;
        } else {
          summary.created += 1;
        }
        continue;
      }

      await writeSubmissionRow(ctx, input.eventId, record, summary, row);
    }

    return summary;
  },
  async importTeams(ctx: ServiceContext, input) {
    await assertEventOrganizer(ctx, input.eventId);

    const summary: ImportSummary = {
      created: 0,
      errors: [],
      skipped: 0,
      updated: 0,
    };

    for (const { record, row } of parseCSVRecordsWithRows(input.csv)) {
      const problem = validateTeamRow(record, row);
      if (problem) {
        summary.errors.push(problem);
        summary.skipped += 1;
        continue;
      }

      const teamId = field(record, "team_id");
      const memberUserId = field(record, "member_user_id");

      if (input.dryRun) {
        // biome-ignore lint/performance/noAwaitInLoops: per-row existence check, kept sequential so errors are reported in spreadsheet order
        if (teamId && (await teamExists(ctx, teamId))) {
          summary.updated += 1;
        } else {
          summary.created += 1;
        }
        continue;
      }

      try {
        const teamName = field(record, "team_name");
        let resolvedTeamId = teamId;
        if (resolvedTeamId) {
          await ctx.db
            .update(team)
            .set({ name: teamName })
            .where(eq(team.id, resolvedTeamId));
          summary.updated += 1;
        } else {
          // A roster usually lists members without repeating the team id, so
          // fall back to matching on name within this event. Without this every
          // member row past the first would create another team.
          const [existing] = await ctx.db
            .select({ id: team.id })
            .from(team)
            .where(
              and(eq(team.eventId, input.eventId), eq(team.name, teamName))
            )
            .limit(1);

          if (existing) {
            resolvedTeamId = existing.id;
          } else {
            resolvedTeamId = generateId("team");
            await ctx.db.insert(team).values({
              eventId: input.eventId,
              id: resolvedTeamId,
              name: teamName,
              ownerId: field(record, "owner_id") || memberUserId,
            });
            summary.created += 1;
          }
        }

        // Membership is additive and idempotent on the (team, user) pair, so
        // re-importing a roster does not duplicate rows.
        if (memberUserId) {
          await ctx.db
            .insert(teamMember)
            .values({ teamId: resolvedTeamId, userId: memberUserId })
            .onConflictDoNothing();
        }
      } catch (error) {
        summary.errors.push({
          field: "row",
          message: error instanceof Error ? error.message : "insert failed",
          row,
        });
        summary.skipped += 1;
      }
    }

    return summary;
  },

  // Raw scores CSV
  async rawScores(ctx: ServiceContext, input) {
    await assertEventOrganizer(ctx, input.eventId);

    const rows = await ctx.db
      .select({
        feedback: score.feedback,
        id: score.id,
        isLocked: score.isLocked,
        judgeId: score.judgeId,
        rubricId: score.rubricId,
        submissionId: score.submissionId,
        submittedAt: score.submittedAt,
        totalScore: score.totalScore,
      })
      .from(score)
      .where(eq(score.eventId, input.eventId));

    const headers = [
      "score_id",
      "judge_id",
      "submission_id",
      "rubric_id",
      "total_score",
      "feedback",
      "is_locked",
      "submitted_at",
    ];

    const csvRows = rows.map((r) => [
      r.id,
      r.judgeId,
      r.submissionId,
      r.rubricId,
      r.totalScore,
      r.feedback,
      r.isLocked ? "1" : "0",
      r.submittedAt?.toISOString(),
    ]);

    return { csv: toCSV(headers, csvRows) };
  },

  // Results CSV
  async results(ctx: ServiceContext, input) {
    await assertEventOrganizer(ctx, input.eventId);

    const rows = await ctx.db
      .select({
        computedAt: result.computedAt,
        finalScore: result.finalScore,
        id: result.id,
        normalizedScore: result.normalizedScore,
        rank: result.rank,
        rawScore: result.rawScore,
        submissionId: result.submissionId,
        trackId: result.trackId,
        trackRank: result.trackRank,
      })
      .from(result)
      .where(eq(result.eventId, input.eventId))
      .orderBy(result.rank);

    const headers = [
      "result_id",
      "submission_id",
      "track_id",
      "rank",
      "track_rank",
      "raw_score",
      "normalized_score",
      "final_score",
      "computed_at",
    ];

    const csvRows = rows.map((r) => [
      r.id,
      r.submissionId,
      r.trackId,
      r.rank,
      r.trackRank,
      r.rawScore,
      r.normalizedScore,
      r.finalScore,
      r.computedAt.toISOString(),
    ]);

    return { csv: toCSV(headers, csvRows) };
  },

  // Submissions CSV
  async submissions(ctx: ServiceContext, input) {
    await assertEventOrganizer(ctx, input.eventId);

    const rows = await ctx.db
      .select({
        createdAt: submission.createdAt,
        id: submission.id,
        liveDemoUrl: submission.liveDemoUrl,
        name: submission.name,
        repositoryUrl: submission.repositoryUrl,
        status: submission.status,
        submittedAt: submission.submittedAt,
        submitterId: submission.submitterId,
        tagline: submission.tagline,
        teamId: submission.teamId,
        techTags: submission.techTags,
        trackId: submission.trackId,
      })
      .from(submission)
      .where(eq(submission.eventId, input.eventId));

    const headers = [
      "id",
      "name",
      "tagline",
      "status",
      "submitter_id",
      "team_id",
      "track_id",
      "tech_tags",
      "repository_url",
      "live_demo_url",
      "submitted_at",
      "created_at",
    ];

    const csvRows = rows.map((r) => [
      r.id,
      r.name,
      r.tagline,
      r.status,
      r.submitterId,
      r.teamId,
      r.trackId,
      Array.isArray(r.techTags) ? r.techTags.join(";") : "",
      r.repositoryUrl,
      r.liveDemoUrl,
      r.submittedAt?.toISOString(),
      r.createdAt.toISOString(),
    ]);

    return { csv: toCSV(headers, csvRows) };
  },

  // Teams CSV
  async teams(ctx: ServiceContext, input) {
    await assertEventOrganizer(ctx, input.eventId);

    const teams = await ctx.db
      .select()
      .from(team)
      .where(eq(team.eventId, input.eventId));

    const members = await ctx.db
      .select()
      .from(teamMember)
      .innerJoin(team, eq(team.id, teamMember.teamId))
      .where(eq(team.eventId, input.eventId));

    const headers = [
      "team_id",
      "team_name",
      "owner_id",
      "member_user_id",
      "joined_at",
    ];

    const csvRows: unknown[][] = [];
    for (const member of members) {
      csvRows.push([
        member.team_member.teamId,
        teams.find((t) => t.id === member.team_member.teamId)?.name,
        teams.find((t) => t.id === member.team_member.teamId)?.ownerId,
        member.team_member.userId,
        member.team_member.joinedAt.toISOString(),
      ]);
    }

    return { csv: toCSV(headers, csvRows) };
  },
};
