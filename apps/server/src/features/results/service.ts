import { writeAudit } from "@rave/api/audit";
import type { ResultsService } from "@rave/api/contract";
import { badRequest, forbidden, notFound } from "@rave/api/errors";
import { generateId } from "@rave/api/id";
import { event, result, rubricCriterion, score, submission } from "@rave/db";
import { and, eq } from "drizzle-orm";

import { assertEventOrganizer } from "../../lib/assert";
import {
  aggregateSubmissionResults,
  assignRanks,
  buildNormalizedScoreMap,
  buildScoreBreakdown,
  groupRawScores,
} from "./helpers";

export const resultsService: ResultsService = {
  // Organizer: compute and store results
  async compute(ctx, input) {
    await assertEventOrganizer(ctx, input.eventId);

    // Load all completed scores for this event
    const scores = await ctx.db
      .select({
        criterionScores: score.criterionScores,
        judgeId: score.judgeId,
        submissionId: score.submissionId,
        totalScore: score.totalScore,
      })
      .from(score)
      .where(eq(score.eventId, input.eventId));

    if (!scores.length) {
      throw badRequest("No scores found for this event");
    }

    // Load criteria for breakdown
    const criteriaRows = await ctx.db
      .select()
      .from(rubricCriterion)
      .where(eq(rubricCriterion.rubricId, input.rubricId));

    const rawBySubmission = groupRawScores(scores);
    const normalizedMap = input.useNormalization
      ? buildNormalizedScoreMap(scores)
      : null;

    const submissionResults = aggregateSubmissionResults(
      rawBySubmission,
      normalizedMap
    );
    submissionResults.sort((a, b) => b.finalScore - a.finalScore);

    // Load track info for submissions
    const submissionRows = await ctx.db
      .select({ id: submission.id, trackId: submission.trackId })
      .from(submission)
      .where(eq(submission.eventId, input.eventId));

    const submissionTrackMap = new Map(
      submissionRows.map((s) => [s.id, s.trackId])
    );
    const { rankMap, trackRankMap } = assignRanks(
      submissionResults,
      submissionTrackMap
    );

    // Upsert results
    await ctx.db.transaction(async (tx) => {
      await Promise.all(
        submissionResults.map(async (r) => {
          const trackId = submissionTrackMap.get(r.submissionId) ?? null;
          const scoreBreakdown = buildScoreBreakdown(
            criteriaRows,
            scores.filter((s) => s.submissionId === r.submissionId)
          );

          const existing = await tx
            .select({ id: result.id })
            .from(result)
            .where(
              and(
                eq(result.eventId, input.eventId),
                eq(result.submissionId, r.submissionId)
              )
            );

          const [existingRow] = existing;
          if (existingRow) {
            await tx
              .update(result)
              .set({
                computedAt: new Date(),
                finalScore: r.finalScore.toFixed(4),
                normalizedScore: r.normalizedScore?.toFixed(4) ?? null,
                rank: rankMap.get(r.submissionId) ?? null,
                rawScore: r.rawScore.toFixed(4),
                scoreBreakdown,
                trackId,
                trackRank: trackRankMap.get(r.submissionId) ?? null,
              })
              .where(eq(result.id, existingRow.id));
          } else {
            await tx.insert(result).values({
              eventId: input.eventId,
              finalScore: r.finalScore.toFixed(4),
              id: generateId("res"),
              normalizedScore: r.normalizedScore?.toFixed(4) ?? null,
              rank: rankMap.get(r.submissionId) ?? null,
              rawScore: r.rawScore.toFixed(4),
              scoreBreakdown,
              submissionId: r.submissionId,
              trackId,
              trackRank: trackRankMap.get(r.submissionId) ?? null,
            });
          }
        })
      );
    });

    await writeAudit(ctx, {
      action: "results.compute",
      eventId: input.eventId,
      metadata: {
        submissionCount: submissionResults.length,
        useNormalization: input.useNormalization,
      },
      resourceId: input.eventId,
      resourceType: "event",
    });

    return {
      computed: submissionResults.length,
      useNormalization: input.useNormalization,
    };
  },

  // Organizer: get full results (including raw/normalized scores)
  async getAdmin(ctx, input) {
    await assertEventOrganizer(ctx, input.eventId);

    const conditions = [eq(result.eventId, input.eventId)];
    if (input.trackId) {
      conditions.push(eq(result.trackId, input.trackId));
    }

    return ctx.db
      .select()
      .from(result)
      .where(and(...conditions))
      .orderBy(result.rank);
  },

  // Public: get published results (respects visibility flag)
  async getPublished(ctx, input) {
    const evRows = await ctx.db
      .select({
        isPublic: event.isPublic,
        judgingResultsVisible: event.judgingResultsVisible,
      })
      .from(event)
      .where(eq(event.id, input.eventId));

    const [ev] = evRows;
    if (!ev) {
      throw notFound("Event not found");
    }

    // Non-organizers can only see results when visible flag is set
    const userId = ctx.session?.user?.id;
    if (!ev.judgingResultsVisible) {
      if (!userId) {
        throw forbidden("Results not yet published");
      }

      // Check if organizer
      const isOrg = await ctx.db
        .select({ organizerId: event.organizerId })
        .from(event)
        .where(eq(event.id, input.eventId));

      if (isOrg[0]?.organizerId !== userId) {
        throw forbidden("Results not yet published");
      }
    }

    const conditions = [eq(result.eventId, input.eventId)];
    if (input.trackId) {
      conditions.push(eq(result.trackId, input.trackId));
    }

    const offset = (input.page - 1) * input.limit;

    const rows = await ctx.db
      .select({
        finalScore: result.finalScore,
        id: result.id,
        publishedAt: result.publishedAt,
        rank: result.rank,
        scoreBreakdown: result.scoreBreakdown,
        submissionId: result.submissionId,
        trackId: result.trackId,
        trackRank: result.trackRank,
      })
      .from(result)
      .where(and(...conditions))
      .orderBy(result.rank)
      .limit(input.limit)
      .offset(offset);

    return { limit: input.limit, page: input.page, results: rows };
  },
};
