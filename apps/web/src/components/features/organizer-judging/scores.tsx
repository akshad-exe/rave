import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rave/ui/components/card";
import { Skeleton } from "@rave/ui/components/skeleton";
import { UsersIcon } from "lucide-react";
import { useMemo } from "react";
import {
  type GalleryRow,
  type JudgePoolEntry,
  judgeName,
  type ProjectScores,
  type ScoreRow,
} from "./shared";

/**
 * Every score submitted on the event. Judges never see each other's, so this is
 * the organizer's window onto partial work.
 */

export function ScoresPanel({
  scores,
  pool,
  submissions,
  status,
}: {
  pool: JudgePoolEntry[] | undefined;
  scores: ScoreRow[] | undefined;
  status: "error" | "pending" | "success";
  submissions: GalleryRow[];
}) {
  const bySubmission = useMemo(
    () => groupScoresBySubmission(scores ?? [], submissions),
    [scores, submissions]
  );

  if (status === "pending") {
    return (
      <Card variant="default">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {(["a", "b", "c"] as const).map((k) => (
            <Skeleton className="h-12 w-full" key={k} />
          ))}
        </CardContent>
      </Card>
    );
  }

  const rows = [...bySubmission.values()];

  return (
    <Card variant="default">
      <CardHeader>
        <CardTitle>Scores</CardTitle>
        <CardDescription>
          Every score submitted on this event. Judges cannot see each other's
          scores.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyScoresState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border border-b text-left text-muted-foreground text-xs">
                  <th className="pb-2 font-medium" scope="col">
                    Project
                  </th>
                  <th className="pb-2 font-medium" scope="col">
                    <span className="sr-only">Scores by judge</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <ProjectScoreRow
                    key={row.submissionId}
                    pool={pool}
                    row={row}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function groupScoresBySubmission(
  scores: ScoreRow[],
  submissions: GalleryRow[]
): Map<string, ProjectScores> {
  const nameById = new Map(
    submissions.map((s) => [s.id, { name: s.name, trackId: s.trackId }])
  );
  const grouped = new Map<string, ProjectScores>();

  for (const score of scores) {
    const known = nameById.get(score.submissionId);
    const existing = grouped.get(score.submissionId);
    const entry: ProjectScores = existing ?? {
      judges: [],
      submissionId: score.submissionId,
      submissionName: known?.name ?? score.submissionId.slice(0, 8),
      trackId: known?.trackId ?? null,
    };
    entry.judges.push({
      judgeId: score.judgeId,
      totalScore: score.totalScore,
    });
    grouped.set(score.submissionId, entry);
  }

  return grouped;
}

function ProjectScoreRow({
  row,
  pool,
}: {
  pool: JudgePoolEntry[] | undefined;
  row: ProjectScores;
}) {
  return (
    <tr className="border-border/60 border-b last:border-0">
      <td className="py-3 pr-4 align-top">
        <p className="font-medium">{row.submissionName}</p>
        {row.trackId ? (
          <p className="text-muted-foreground text-xs">Track assigned</p>
        ) : null}
      </td>
      <td className="py-3">
        <div className="flex flex-wrap gap-2">
          {row.judges.map((judge) => (
            <ScoreChip
              judgeId={judge.judgeId}
              key={judge.judgeId}
              pool={pool}
              totalScore={judge.totalScore}
            />
          ))}
        </div>
      </td>
    </tr>
  );
}

const CHIP_CLASS =
  "inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-1 text-xs";

function ScoreChip({
  judgeId,
  totalScore,
  pool,
}: {
  judgeId: string;
  pool: JudgePoolEntry[] | undefined;
  totalScore: string | null;
}) {
  const isScored = totalScore !== null;
  return (
    <span className={CHIP_CLASS}>
      <UsersIcon className="size-3 text-muted-foreground" />
      <span className="text-muted-foreground">{judgeName(pool, judgeId)}</span>
      <span className={isScored ? "font-medium" : "text-muted-foreground"}>
        {isScored ? Number(totalScore).toFixed(1) : "—"}
      </span>
    </span>
  );
}

function EmptyScoresState() {
  return (
    <p className="py-6 text-center text-muted-foreground text-sm">
      No scores submitted yet. Once judges start submitting, every score appears
      here.
    </p>
  );
}
