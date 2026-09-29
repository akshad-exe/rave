import type { client } from "@/utils/orpc";

/**
 * Types and name resolution shared by the judging panels.
 *
 * `judgeName` exists because the API returns judge *ids* everywhere. Falling
 * back to a truncated id beats rendering a blank cell, but it should be visible
 * as a fallback rather than silently pretending to be a name.
 */

export type ProgressOverview = Awaited<
  ReturnType<typeof client.assignments.progress>
>;
export type JudgePoolEntry = Awaited<
  ReturnType<typeof client.assignments.judgePool>
>[number];
export type ScoreRow = Awaited<
  ReturnType<typeof client.scoring.allScores>
>[number];
export type BatchResult = Awaited<
  ReturnType<typeof client.assignments.batchAssign>
>;
export type GalleryRow = Awaited<
  ReturnType<typeof client.submissions.gallery>
>["submissions"][number];

export interface JudgeProgress {
  completed: number;
  in_progress: number;
  pending: number;
  total: number;
}

export interface ProjectScores {
  judges: Array<{ judgeId: string; totalScore: string | null }>;
  submissionId: string;
  submissionName: string;
  trackId: string | null;
}

export function judgeName(
  judges: JudgePoolEntry[] | undefined,
  judgeId: string
): string {
  return judges?.find((j) => j.id === judgeId)?.name ?? judgeId.slice(0, 8);
}
