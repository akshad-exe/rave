/**
 * Z-score normalization per judge.
 *
 * For each judge, compute mean and stddev of their total scores,
 * then normalize: z = (x - mean) / stddev
 *
 * Handles:
 *   - stddev = 0 → all scores equal, normalized to 0 (or 50 on 0–100 scale)
 *   - < 2 scores per judge → pass-through (cannot normalize)
 *
 * Returns normalized scores scaled to [0, 100].
 */
export function zScoreNormalize(
  judgeScores: Array<{
    judgeId: string;
    submissionId: string;
    rawScore: number;
  }>
): Array<{
  judgeId: string;
  submissionId: string;
  rawScore: number;
  normalizedScore: number;
}> {
  // Group by judge
  const byJudge = new Map<
    string,
    Array<{ submissionId: string; rawScore: number }>
  >();
  for (const s of judgeScores) {
    const judgeList = byJudge.get(s.judgeId);
    if (judgeList) {
      judgeList.push({ rawScore: s.rawScore, submissionId: s.submissionId });
    } else {
      byJudge.set(s.judgeId, [
        { rawScore: s.rawScore, submissionId: s.submissionId },
      ]);
    }
  }

  const normalized: Array<{
    judgeId: string;
    submissionId: string;
    rawScore: number;
    normalizedScore: number;
  }> = [];

  for (const [judgeId, scores] of byJudge) {
    if (scores.length < 2) {
      // Not enough scores to normalize; pass through mapped to midpoint scale
      for (const s of scores) {
        normalized.push({
          judgeId,
          normalizedScore: 50,
          rawScore: s.rawScore,
          submissionId: s.submissionId,
        });
      }
      continue;
    }

    const mean = scores.reduce((sum, s) => sum + s.rawScore, 0) / scores.length;
    const variance =
      scores.reduce((sum, s) => sum + (s.rawScore - mean) ** 2, 0) /
      (scores.length - 1);
    const stddev = Math.sqrt(variance);

    for (const s of scores) {
      let normalizedScore: number;
      if (stddev < 0.0001) {
        // All scores identical — set to midpoint
        normalizedScore = 50;
      } else {
        // Z-score mapped to [0, 100] with mean at 50, ±3 stddev covering full range
        const zScore = (s.rawScore - mean) / stddev;
        normalizedScore = Math.max(0, Math.min(100, 50 + zScore * (100 / 6)));
      }
      normalized.push({
        judgeId,
        normalizedScore,
        rawScore: s.rawScore,
        submissionId: s.submissionId,
      });
    }
  }

  return normalized;
}
