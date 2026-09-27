import { writeAudit } from "@rave/api/audit";
import type { ScoringService } from "@rave/api/contract";
import { badRequest, notFound } from "@rave/api/errors";
import { generateId } from "@rave/api/id";
import { judgeAssignment, rubric, rubricCriterion, score } from "@rave/db";
import { eq } from "drizzle-orm";

import {
  assertEventOrganizer,
  requireRow,
  requireUserId,
} from "../../lib/assert";
import {
  assertCriteriaScoresValid,
  assertJudgingOpen,
  computeTotalScore,
  getAssignment,
} from "./helpers";

export const scoringService: ScoringService = {
  // Organizer: get all scores for an event (never exposed to judges)
  async allScores(ctx, input) {
    await assertEventOrganizer(ctx, input.eventId);

    return ctx.db
      .select({
        criterionScores: score.criterionScores,
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
  },

  // Judge: get my own score for an assignment
  async getMyScore(ctx, input) {
    const judgeId = requireUserId(ctx);
    // Isolation: verify assignment belongs to this judge
    await getAssignment(ctx, input.assignmentId, judgeId);

    const rows = await ctx.db
      .select()
      .from(score)
      .where(eq(score.assignmentId, input.assignmentId));

    return rows[0] ?? null;
  },

  // Organizer: lock scores for an event (prevent further edits)
  async lockScores(ctx, input) {
    await assertEventOrganizer(ctx, input.eventId);

    await ctx.db
      .update(score)
      .set({ isLocked: true })
      .where(eq(score.eventId, input.eventId));

    await writeAudit(ctx, {
      action: "scores.lock",
      eventId: input.eventId,
      resourceId: input.eventId,
      resourceType: "event",
    });

    return { ok: true };
  },

  // Judge: submit score for an assignment
  async submit(ctx, input) {
    const judgeId = requireUserId(ctx);
    const assignment = await getAssignment(ctx, input.assignmentId, judgeId);

    // Enforce judging window
    await assertJudgingOpen(ctx, assignment.eventId);

    // Check if already scored
    const existingScore = await ctx.db
      .select({ id: score.id, isLocked: score.isLocked })
      .from(score)
      .where(eq(score.assignmentId, input.assignmentId));

    if (existingScore[0]?.isLocked) {
      throw badRequest("Score is locked and cannot be changed");
    }

    // Load rubric and validate
    const criteriaRows = await ctx.db
      .select()
      .from(rubricCriterion)
      .where(eq(rubricCriterion.rubricId, input.rubricId));

    if (!criteriaRows.length) {
      throw notFound("Rubric not found or has no criteria");
    }

    const criteriaMap = new Map(criteriaRows.map((c) => [c.id, c]));

    // Validate each criterion score and ensure full coverage
    assertCriteriaScoresValid(criteriaMap, criteriaRows, input.criterionScores);

    // Calculate weighted total score
    const rubricRows = await ctx.db
      .select({ isWeighted: rubric.isWeighted })
      .from(rubric)
      .where(eq(rubric.id, input.rubricId));

    const isWeighted = rubricRows[0]?.isWeighted ?? true;

    const totalScore = computeTotalScore(
      criteriaMap,
      input.criterionScores,
      isWeighted
    );

    const scoreId = existingScore[0]?.id ?? generateId("scr");

    // Transactional: upsert score + update assignment status
    await ctx.db.transaction(async (tx) => {
      if (existingScore.length) {
        await tx
          .update(score)
          .set({
            criterionScores: input.criterionScores,
            feedback: input.feedback,
            totalScore: totalScore.toFixed(4),
            updatedAt: new Date(),
          })
          .where(eq(score.id, scoreId));
      } else {
        await tx.insert(score).values({
          assignmentId: input.assignmentId,
          criterionScores: input.criterionScores,
          eventId: assignment.eventId,
          feedback: input.feedback,
          id: scoreId,
          judgeId,
          rubricId: input.rubricId,
          submissionId: assignment.submissionId,
          totalScore: totalScore.toFixed(4),
        });
      }

      await tx
        .update(judgeAssignment)
        .set({ completedAt: new Date(), status: "completed" })
        .where(eq(judgeAssignment.id, input.assignmentId));
    });

    await writeAudit(ctx, {
      action: "score.submit",
      eventId: assignment.eventId,
      metadata: { assignmentId: input.assignmentId, totalScore },
      resourceId: scoreId,
      resourceType: "score",
    });

    const rows = await ctx.db.select().from(score).where(eq(score.id, scoreId));
    return requireRow(rows, "Score not found");
  },
};
