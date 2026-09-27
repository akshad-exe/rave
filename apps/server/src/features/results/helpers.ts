import type { rubricCriterion } from "@rave/db";

import { zScoreNormalize } from "../../lib/normalization";

export interface ScoreRow {
  criterionScores: Array<{ criterionId: string; score: number }> | null;
  judgeId: string;
  submissionId: string;
  totalScore: string | null;
}

export interface RawJudgeScore {
  judgeId: string;
  rawScore: number;
}

export interface SubmissionResult {
  finalScore: number;
  normalizedScore: number | null;
  rawScore: number;
  submissionId: string;
}

type CriterionRow = typeof rubricCriterion.$inferSelect;

export interface CriterionBreakdown {
  averageScore: number;
  criterionId: string;
  name: string;
  weight: number;
}

export function groupRawScores(
  scores: ScoreRow[]
): Map<string, RawJudgeScore[]> {
  const rawBySubmission = new Map<string, RawJudgeScore[]>();
  for (const s of scores) {
    if (!s.totalScore) {
      continue;
    }
    const rawScore = { judgeId: s.judgeId, rawScore: Number(s.totalScore) };
    const scoresForSubmission = rawBySubmission.get(s.submissionId);
    if (scoresForSubmission) {
      scoresForSubmission.push(rawScore);
    } else {
      rawBySubmission.set(s.submissionId, [rawScore]);
    }
  }
  return rawBySubmission;
}

export function buildNormalizedScoreMap(
  scores: ScoreRow[]
): Map<string, Map<string, number>> {
  const flat = scores
    .filter((s) => s.totalScore !== null)
    .map((s) => ({
      judgeId: s.judgeId,
      rawScore: Number(s.totalScore),
      submissionId: s.submissionId,
    }));

  const normalizedMap = new Map<string, Map<string, number>>();
  for (const n of zScoreNormalize(flat)) {
    const perSubmission = normalizedMap.get(n.submissionId);
    if (perSubmission) {
      perSubmission.set(n.judgeId, n.normalizedScore);
    } else {
      normalizedMap.set(
        n.submissionId,
        new Map<string, number>([[n.judgeId, n.normalizedScore]])
      );
    }
  }
  return normalizedMap;
}

export function aggregateSubmissionResults(
  rawBySubmission: Map<string, RawJudgeScore[]>,
  normalizedMap: Map<string, Map<string, number>> | null
): SubmissionResult[] {
  const submissionResults: SubmissionResult[] = [];
  for (const [submissionId, judgeScores] of rawBySubmission) {
    const rawScore =
      judgeScores.reduce((sum, s) => sum + s.rawScore, 0) / judgeScores.length;

    let normalizedScore: number | null = null;
    if (normalizedMap) {
      const normScores = judgeScores
        .map((s) => normalizedMap.get(submissionId)?.get(s.judgeId))
        .filter((v): v is number => v !== undefined);

      normalizedScore =
        normScores.length > 0
          ? normScores.reduce((sum, v) => sum + v, 0) / normScores.length
          : null;
    }

    submissionResults.push({
      finalScore: normalizedScore ?? rawScore,
      normalizedScore,
      rawScore,
      submissionId,
    });
  }
  return submissionResults;
}

export function assignRanks(
  submissionResults: SubmissionResult[],
  submissionTrackMap: Map<string, string | null>
): { rankMap: Map<string, number>; trackRankMap: Map<string, number> } {
  const rankMap = new Map<string, number>();
  let rank = 1;
  for (const r of submissionResults) {
    rankMap.set(r.submissionId, rank);
    rank += 1;
  }

  const byTrack = new Map<string, SubmissionResult[]>();
  for (const r of submissionResults) {
    const trackId = submissionTrackMap.get(r.submissionId) ?? "__none__";
    const trackResults = byTrack.get(trackId);
    if (trackResults) {
      trackResults.push(r);
    } else {
      byTrack.set(trackId, [r]);
    }
  }

  const trackRankMap = new Map<string, number>();
  for (const [, trackResults] of byTrack) {
    let trackRank = 1;
    for (const r of trackResults) {
      trackRankMap.set(r.submissionId, trackRank);
      trackRank += 1;
    }
  }

  return { rankMap, trackRankMap };
}

export function buildScoreBreakdown(
  criteriaRows: CriterionRow[],
  submissionScores: ScoreRow[]
): CriterionBreakdown[] {
  const criterionMap = new Map<string, number[]>();
  for (const s of submissionScores) {
    for (const cs of (s.criterionScores ?? []) as Array<{
      criterionId: string;
      score: number;
    }>) {
      const scoreList = criterionMap.get(cs.criterionId);
      if (scoreList) {
        scoreList.push(cs.score);
      } else {
        criterionMap.set(cs.criterionId, [cs.score]);
      }
    }
  }

  return criteriaRows.map((c) => {
    const criterionScores = criterionMap.get(c.id) ?? [];
    const avg =
      criterionScores.length > 0
        ? criterionScores.reduce((sum, v) => sum + v, 0) /
          criterionScores.length
        : 0;
    return {
      averageScore: avg,
      criterionId: c.id,
      name: c.name,
      weight: Number(c.weight),
    };
  });
}
