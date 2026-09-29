import { writeAudit } from "@rave/api/audit";
import type { AssignmentsService } from "@rave/api/contract";
import {
  badRequest,
  conflict,
  isUniqueViolation,
  notFound,
} from "@rave/api/errors";
import { generateId } from "@rave/api/id";
import {
  judgeAssignment,
  submission,
  teamMember,
  user,
  userProfile,
} from "@rave/db";
import { and, count, eq, inArray, sql } from "drizzle-orm";

import {
  assertEventOrganizer,
  requireRow,
  requireUserId,
} from "../../lib/assert";
import { batchSkipReason, getAssignment } from "./helpers";

interface CoveragePlan {
  assigned: Array<{ judgeId: string; submissionId: string }>;
  skipped: Array<{ judgeId: string; reason: string; submissionId: string }>;
}

/**
 * Decide which judges review which submissions.
 *
 * Coverage first, load second. The obvious loop — walk judges, give each N
 * submissions — is greedy over submission order, so the earliest projects
 * collect every judge and the later ones collect none. On the fixture set
 * (40 projects, 30 judges) that produced between 2 and 5 reviews per project
 * and a judge load of 1 to 11.
 *
 * Instead each submission asks for `target` judges, taking at every step the
 * eligible judge carrying the least work so far. Ties break on judge id, so a
 * re-run produces the same plan and the result is reproducible.
 */
function planCoverage({
  existingPairs,
  existingRows,
  judgeIds,
  membersByTeam,
  submissions,
  target,
}: {
  existingPairs: Set<string>;
  existingRows: Array<{ judgeId: string; submissionId: string }>;
  judgeIds: string[];
  membersByTeam: Map<string, Set<string>>;
  submissions: Array<{
    id: string;
    submitterId: string;
    teamId: string | null;
  }>;
  target: number;
}): CoveragePlan {
  const assigned: CoveragePlan["assigned"] = [];
  const skipped: CoveragePlan["skipped"] = [];

  const judgeLoad = new Map<string, number>();
  for (const judgeId of judgeIds) {
    judgeLoad.set(judgeId, 0);
  }
  // A judge already carrying an assignment for this event starts from that
  // load, so a second pass does not stack work on the same few judges.
  for (const row of existingRows) {
    if (judgeLoad.has(row.judgeId)) {
      judgeLoad.set(row.judgeId, (judgeLoad.get(row.judgeId) ?? 0) + 1);
    }
  }

  for (const sub of submissions) {
    const eligible = judgeIds
      .filter(
        (judge) =>
          batchSkipReason(judge, sub, membersByTeam, existingPairs) === null
      )
      .sort((a, b) => {
        const loadDiff = (judgeLoad.get(a) ?? 0) - (judgeLoad.get(b) ?? 0);
        return loadDiff === 0 ? a.localeCompare(b) : loadDiff;
      });

    const taken = eligible.slice(0, target);
    for (const judge of taken) {
      judgeLoad.set(judge, (judgeLoad.get(judge) ?? 0) + 1);
      assigned.push({ judgeId: judge, submissionId: sub.id });
    }

    // Record why a judge did not get this project rather than leaving a silent
    // hole in the plan.
    for (const judge of judgeIds) {
      if (taken.includes(judge)) {
        continue;
      }
      skipped.push({
        judgeId: judge,
        reason:
          batchSkipReason(judge, sub, membersByTeam, existingPairs) ??
          "judge_pool_exhausted",
        submissionId: sub.id,
      });
    }
  }

  return { assigned, skipped };
}

export const assignmentsService: AssignmentsService = {
  // Organizer: assign judge to submission
  async assign(ctx, input) {
    await assertEventOrganizer(ctx, input.eventId);

    // Verify submission belongs to event
    const subRows = await ctx.db
      .select({
        eventId: submission.eventId,
        status: submission.status,
        submitterId: submission.submitterId,
        teamId: submission.teamId,
      })
      .from(submission)
      .where(eq(submission.id, input.submissionId));

    const [sub] = subRows;
    if (!sub) {
      throw notFound("Submission not found");
    }
    if (sub.eventId !== input.eventId) {
      throw badRequest("Submission not in this event");
    }
    if (sub.status === "disqualified") {
      throw badRequest("Cannot assign disqualified submission");
    }

    // Prevent judge from scoring their own team's submission
    if (sub.teamId) {
      const memberRows = await ctx.db
        .select({ userId: teamMember.userId })
        .from(teamMember)
        .where(
          and(
            eq(teamMember.teamId, sub.teamId),
            eq(teamMember.userId, input.judgeId)
          )
        );
      if (memberRows.length) {
        throw badRequest("Cannot assign judge to their own team's submission");
      }
    } else if (sub.submitterId === input.judgeId) {
      throw badRequest("Cannot assign judge to their own submission");
    }

    const id = generateId("ass");
    try {
      await ctx.db.insert(judgeAssignment).values({
        eventId: input.eventId,
        id,
        judgeId: input.judgeId,
        submissionId: input.submissionId,
        trackId: sub.teamId
          ? ((
              await ctx.db
                .select({ trackId: submission.trackId })
                .from(submission)
                .where(eq(submission.id, input.submissionId))
            )[0]?.trackId ?? null)
          : null,
      });
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        throw conflict("Judge already assigned to this submission");
      }
      throw err;
    }

    await writeAudit(ctx, {
      action: "judge.assign",
      eventId: input.eventId,
      metadata: { judgeId: input.judgeId, submissionId: input.submissionId },
      resourceId: id,
      resourceType: "judge_assignment",
    });

    const rows = await ctx.db
      .select()
      .from(judgeAssignment)
      .where(eq(judgeAssignment.id, id));
    return requireRow(rows, "Assignment not found");
  },

  // Organizer: batch assign N judges to all/filtered submissions
  async batchAssign(ctx, input) {
    await assertEventOrganizer(ctx, input.eventId);

    const conditions = [
      eq(submission.eventId, input.eventId),
      eq(submission.status, "submitted"),
    ];
    if (input.trackId) {
      conditions.push(eq(submission.trackId, input.trackId));
    }

    const submissions = await ctx.db
      .select({
        id: submission.id,
        submitterId: submission.submitterId,
        teamId: submission.teamId,
      })
      .from(submission)
      .where(and(...conditions));

    // Preload team memberships so the per-pair loop stays query-free
    const teamIds = [
      ...new Set(submissions.flatMap((s) => (s.teamId ? [s.teamId] : []))),
    ];
    const memberRows = teamIds.length
      ? await ctx.db
          .select({ teamId: teamMember.teamId, userId: teamMember.userId })
          .from(teamMember)
          .where(inArray(teamMember.teamId, teamIds))
      : [];
    const membersByTeam = new Map<string, Set<string>>();
    for (const row of memberRows) {
      const members = membersByTeam.get(row.teamId) ?? new Set<string>();
      members.add(row.userId);
      membersByTeam.set(row.teamId, members);
    }

    // Preload existing assignments so the per-pair loop stays query-free
    const existingRows = await ctx.db
      .select({
        judgeId: judgeAssignment.judgeId,
        submissionId: judgeAssignment.submissionId,
      })
      .from(judgeAssignment)
      .where(eq(judgeAssignment.eventId, input.eventId));
    const existingPairs = new Set(
      existingRows.map((r) => `${r.judgeId}:${r.submissionId}`)
    );

    const assigned: Array<{ judgeId: string; submissionId: string }> = [];
    const skipped: Array<{
      judgeId: string;
      reason: string;
      submissionId: string;
    }> = [];
    const toInsert: typeof assigned = [];

    // Coverage first, load second.
    //
    // The obvious loop — walk judges, give each N submissions — is greedy over
    // submission order, so the earliest projects collect every judge and the
    // later ones collect none. On the fixture set (40 projects, 30 judges) that
    // produced between 2 and 5 reviews per project and a judge load of 1 to 11.
    //
    // Instead each submission asks for `reviewsPerSubmission` judges, choosing
    // at every step the eligible judge carrying the least work so far. Ties
    // break on judge id so a re-run produces the same plan and a dry run is
    // reproducible.
    const plan = planCoverage({
      existingPairs,
      existingRows,
      judgeIds: input.judgeIds,
      membersByTeam,
      submissions,
      target: input.reviewsPerSubmission ?? input.submissionsPerJudge ?? 3,
    });
    toInsert.push(...plan.assigned);
    assigned.push(...plan.assigned);
    skipped.push(...plan.skipped);

    if (toInsert.length) {
      await ctx.db.insert(judgeAssignment).values(
        toInsert.map((a) => ({
          eventId: input.eventId,
          id: generateId("ass"),
          judgeId: a.judgeId,
          submissionId: a.submissionId,
        }))
      );
    }

    return {
      assigned: assigned.length,
      details: { assigned, skipped },
      skipped: skipped.length,
    };
  },

  // Judge: get assigned submission details (with isolation check)
  async getAssignedSubmission(ctx, input) {
    const judgeId = requireUserId(ctx);
    const assignment = await getAssignment(ctx, input.assignmentId, judgeId);

    const subRows = await ctx.db
      .select({
        customAnswers: submission.customAnswers,
        demoVideoUrl: submission.demoVideoUrl,
        description: submission.description,
        galleryImageUrls: submission.galleryImageUrls,
        id: submission.id,
        liveDemoUrl: submission.liveDemoUrl,
        name: submission.name,
        repositoryUrl: submission.repositoryUrl,
        tagline: submission.tagline,
        techTags: submission.techTags,
        thumbnailUrl: submission.thumbnailUrl,
        trackId: submission.trackId,
        // Do NOT expose submitterId or teamId to judges to prevent bias
      })
      .from(submission)
      .where(eq(submission.id, assignment.submissionId));

    return {
      assignment,
      submission: requireRow(subRows, "Submission not found"),
    };
  },
  // Organizer: enumerate the judge pool for an event
  async judgePool(ctx, input) {
    await assertEventOrganizer(ctx, input.eventId);

    const judges = await ctx.db
      .select({ email: user.email, id: user.id, name: user.name })
      .from(user)
      .innerJoin(userProfile, eq(userProfile.userId, user.id))
      .where(eq(userProfile.role, "judge"))
      .orderBy(user.name);

    if (judges.length === 0) {
      return [];
    }

    // Current load per judge on this event, so the organizer can see who has
    // room before assigning rather than discovering it from a skip reason.
    const loadRows = await ctx.db
      .select({
        assignedCount: count(),
        completedCount:
          sql<number>`count(*) filter (where ${judgeAssignment.status} = 'completed')`.mapWith(
            Number
          ),
        judgeId: judgeAssignment.judgeId,
      })
      .from(judgeAssignment)
      .where(eq(judgeAssignment.eventId, input.eventId))
      .groupBy(judgeAssignment.judgeId);

    const loadByJudge = new Map(loadRows.map((r) => [r.judgeId, r]));

    return judges.map((judge) => {
      const load = loadByJudge.get(judge.id);
      return {
        assignedCount: load ? Number(load.assignedCount) : 0,
        completedCount: load ? Number(load.completedCount) : 0,
        email: judge.email,
        id: judge.id,
        name: judge.name,
      };
    });
  },

  // Judge: get my assignments
  myAssignments(ctx, input) {
    const judgeId = requireUserId(ctx);

    // JUDGE ISOLATION: only own assignments
    return ctx.db
      .select({
        assignedAt: judgeAssignment.assignedAt,
        completedAt: judgeAssignment.completedAt,
        id: judgeAssignment.id,
        status: judgeAssignment.status,
        submissionId: judgeAssignment.submissionId,
        trackId: judgeAssignment.trackId,
      })
      .from(judgeAssignment)
      .where(
        and(
          eq(judgeAssignment.eventId, input.eventId),
          eq(judgeAssignment.judgeId, judgeId)
        )
      );
  },

  // Judge: my progress
  async myProgress(ctx, input) {
    const judgeId = requireUserId(ctx);

    const rows = await ctx.db
      .select({ cnt: count(), status: judgeAssignment.status })
      .from(judgeAssignment)
      .where(
        and(
          eq(judgeAssignment.eventId, input.eventId),
          eq(judgeAssignment.judgeId, judgeId)
        )
      )
      .groupBy(judgeAssignment.status);

    const summary = { completed: 0, in_progress: 0, pending: 0, total: 0 };
    for (const row of rows) {
      summary[row.status as keyof typeof summary] = Number(row.cnt);
      summary.total += Number(row.cnt);
    }
    summary.total = summary.pending + summary.in_progress + summary.completed;

    return {
      ...summary,
      completionPercent:
        summary.total > 0
          ? Math.round((summary.completed / summary.total) * 100)
          : 0,
    };
  },

  // Organizer: progress overview (does NOT expose per-judge scores to other judges)
  async progress(ctx, input) {
    await assertEventOrganizer(ctx, input.eventId);

    const rows = await ctx.db
      .select({
        cnt: count(),
        judgeId: judgeAssignment.judgeId,
        status: judgeAssignment.status,
      })
      .from(judgeAssignment)
      .where(eq(judgeAssignment.eventId, input.eventId))
      .groupBy(judgeAssignment.judgeId, judgeAssignment.status);

    const byJudge: Record<
      string,
      {
        pending: number;
        in_progress: number;
        completed: number;
        total: number;
      }
    > = {};

    for (const row of rows) {
      if (!byJudge[row.judgeId]) {
        byJudge[row.judgeId] = {
          completed: 0,
          in_progress: 0,
          pending: 0,
          total: 0,
        };
      }
      const j = byJudge[row.judgeId];
      if (!j) {
        continue;
      }
      j[row.status as keyof typeof j] = Number(row.cnt);
      j.total += Number(row.cnt);
    }

    const totalAssignments = Object.values(byJudge).reduce(
      (s, j) => s + j.total,
      0
    );
    const completedAssignments = Object.values(byJudge).reduce(
      (s, j) => s + j.completed,
      0
    );

    return {
      byJudge,
      completed: completedAssignments,
      completionPercent:
        totalAssignments > 0
          ? Math.round((completedAssignments / totalAssignments) * 100)
          : 0,
      remaining: totalAssignments - completedAssignments,
      total: totalAssignments,
    };
  },
};
