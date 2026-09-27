import type { ServiceContext } from "@rave/api/context";
import type { ExportsService } from "@rave/api/contract";
import {
  judgeAssignment,
  result,
  score,
  submission,
  team,
  teamMember,
} from "@rave/db";
import { eq } from "drizzle-orm";

import { assertEventOrganizer } from "../../lib/assert";
import { toCSV } from "../../lib/csv";

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
