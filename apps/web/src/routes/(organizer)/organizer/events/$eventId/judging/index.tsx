import { Alert } from "@rave/ui/components/alert";
import { Badge } from "@rave/ui/components/badge";
import { Button } from "@rave/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rave/ui/components/card";
import {
  Combobox,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
} from "@rave/ui/components/combobox";
import { Input } from "@rave/ui/components/input";
import { Label } from "@rave/ui/components/label";
import { Progress } from "@rave/ui/components/progress";
import { ScrollArea } from "@rave/ui/components/scroll-area";
import { Separator } from "@rave/ui/components/separator";
import { Skeleton } from "@rave/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  ScaleIcon,
  TriangleAlertIcon,
  UsersIcon,
} from "lucide-react";
import type * as React from "react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { type client, orpc } from "@/utils/orpc";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProgressOverview = Awaited<ReturnType<typeof client.assignments.progress>>;
type JudgePoolEntry = Awaited<
  ReturnType<typeof client.assignments.judgePool>
>[number];
type ScoreRow = Awaited<ReturnType<typeof client.scoring.allScores>>[number];
type BatchResult = Awaited<ReturnType<typeof client.assignments.batchAssign>>;
type GalleryRow = Awaited<
  ReturnType<typeof client.submissions.gallery>
>["submissions"][number];

interface JudgeProgress {
  completed: number;
  in_progress: number;
  pending: number;
  total: number;
}

interface ProjectScores {
  judges: Array<{ judgeId: string; totalScore: string | null }>;
  submissionId: string;
  submissionName: string;
  trackId: string | null;
}

function handleAsync(fn: () => Promise<void>) {
  return () => {
    fn();
  };
}

function judgeName(
  judges: JudgePoolEntry[] | undefined,
  judgeId: string
): string {
  return judges?.find((j) => j.id === judgeId)?.name ?? judgeId.slice(0, 8);
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute(
  "/(organizer)/organizer/events/$eventId/judging/"
)({
  component: JudgingConsolePage,
});

// ─── Page ─────────────────────────────────────────────────────────────────────

function JudgingConsolePage() {
  const { eventId } = Route.useParams();

  const progressQuery = useQuery(
    orpc.assignments.progress.queryOptions({ input: { eventId } })
  );
  const poolQuery = useQuery(
    orpc.assignments.judgePool.queryOptions({ input: { eventId } })
  );
  const scoresQuery = useQuery(
    orpc.scoring.allScores.queryOptions({ input: { eventId } })
  );
  const galleryQuery = useQuery(
    orpc.submissions.gallery.queryOptions({
      input: { eventId, limit: 100 },
    })
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-1">
        <Link
          className="mb-2 flex w-fit items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
          to="/organizer/events"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to events
        </Link>
        <h1 className="font-bold font-display text-3xl text-foreground">
          Judging Console
        </h1>
        <p className="text-muted-foreground">
          Assign judges, watch progress, and review every score before results
          are computed.
        </p>
      </header>

      <ProgressOverviewSection
        pool={poolQuery.data}
        progress={progressQuery.data}
        status={progressQuery.status}
      />

      <BatchAssignSection
        eventId={eventId}
        pool={poolQuery.data}
        poolStatus={poolQuery.status}
      />

      <SingleAssignSection
        eventId={eventId}
        pool={poolQuery.data}
        submissions={galleryQuery.data?.submissions ?? []}
      />

      <ScoresSection
        pool={poolQuery.data}
        scores={scoresQuery.data}
        status={scoresQuery.status}
        submissions={galleryQuery.data?.submissions ?? []}
      />
    </div>
  );
}

// ─── Progress ─────────────────────────────────────────────────────────────────

function ProgressOverviewSection({
  progress,
  pool,
  status,
}: {
  pool: JudgePoolEntry[] | undefined;
  progress: ProgressOverview | undefined;
  status: "error" | "pending" | "success";
}) {
  if (status === "pending") {
    return (
      <Card variant="default">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {(["a", "b", "c"] as const).map((k) => (
            <Skeleton className="h-10 w-full" key={k} />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!progress) {
    return (
      <Alert
        description="We could not load judging progress for this event."
        title="Progress unavailable"
        variant="destructive"
      />
    );
  }

  const rows = Object.entries(progress.byJudge).sort(([a], [b]) =>
    judgeName(pool, a).localeCompare(judgeName(pool, b))
  );

  return (
    <Card variant="default">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Judging progress</CardTitle>
            <CardDescription>
              {progress.total === 0
                ? "No assignments yet — run a batch assign below."
                : `${progress.completed} of ${progress.total} assignments scored.`}
            </CardDescription>
          </div>
          <CompletionBadge
            percent={progress.completionPercent}
            remaining={progress.remaining}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress.completionPercent} />

        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nothing assigned yet. Choose judges below to start.
          </p>
        ) : (
          <JudgeProgressTable pool={pool} rows={rows} />
        )}
      </CardContent>
    </Card>
  );
}

function CompletionBadge({
  percent,
  remaining,
}: {
  percent: number;
  remaining: number;
}) {
  const tone = (() => {
    if (percent === 100) {
      return "success";
    }
    if (percent === 0) {
      return "outline";
    }
    return "default";
  })();
  return (
    <div className="text-right">
      <Badge variant={tone}>{percent}% complete</Badge>
      {remaining > 0 ? (
        <p className="mt-1 text-muted-foreground text-xs">
          {remaining} remaining
        </p>
      ) : null}
    </div>
  );
}

function JudgeProgressTable({
  rows,
  pool,
}: {
  pool: JudgePoolEntry[] | undefined;
  rows: [string, JudgeProgress][];
}) {
  return (
    // 30 judges in the fixture and no upper bound in the schema, so cap the
    // height and scroll rather than pushing the batch-assign panel off screen.
    <ScrollArea className="max-h-96">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-background">
          <tr className="border-border border-b text-left text-muted-foreground text-xs">
            <th className="pb-2 font-medium" scope="col">
              Judge
            </th>
            <th className="pb-2 font-medium" scope="col">
              Progress
            </th>
            <th className="pb-2 font-medium" scope="col">
              <span className="sr-only">Counts</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([judgeId, stat]) => (
            <JudgeProgressRow
              judgeId={judgeId}
              key={judgeId}
              pool={pool}
              stat={stat}
            />
          ))}
        </tbody>
      </table>
    </ScrollArea>
  );
}

function JudgeProgressRow({
  judgeId,
  pool,
  stat,
}: {
  judgeId: string;
  pool: JudgePoolEntry[] | undefined;
  stat: JudgeProgress;
}) {
  const done =
    stat.total === 0 ? 0 : Math.round((stat.completed / stat.total) * 100);
  return (
    <tr className="border-border/60 border-b last:border-0">
      <td className="py-2.5 pr-4">
        <p className="font-medium">{judgeName(pool, judgeId)}</p>
        <p className="text-muted-foreground text-xs">
          {stat.completed} of {stat.total} scored
        </p>
      </td>
      <td className="py-2.5 pr-4">
        <Progress className="min-w-32" value={done} />
      </td>
      <td className="py-2.5 text-muted-foreground text-xs">
        {stat.pending} pending · {stat.in_progress} in progress
      </td>
    </tr>
  );
}

// ─── Batch assign ─────────────────────────────────────────────────────────────

function BatchAssignSection({
  eventId,
  pool,
  poolStatus,
}: {
  eventId: string;
  pool: JudgePoolEntry[] | undefined;
  poolStatus: "error" | "pending" | "success";
}) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [reviews, setReviews] = useState(3);
  const [result, setResult] = useState<BatchResult | null>(null);

  const assignMutation = useMutation(
    orpc.assignments.batchAssign.mutationOptions()
  );

  const handleSelectionChange = useCallback((next: string[] | null) => {
    setSelected(next ?? []);
  }, []);

  const handleReviewsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setReviews(Number.parseInt(e.target.value, 10) || 1);
    },
    []
  );

  const handleAssign = useCallback(async () => {
    try {
      const res = await assignMutation.mutateAsync({
        eventId,
        judgeIds: selected,
        reviewsPerSubmission: reviews,
      });
      setResult(res);
      toast.success(`Assigned ${res.assigned} · skipped ${res.skipped}`);
      // Invalidate one key per call: a heterogeneous array of query options
      // collapses to a single inferred type and no longer matches the client's.
      queryClient
        .invalidateQueries(
          orpc.assignments.progress.queryOptions({ input: { eventId } })
        )
        .catch(() => undefined);
      queryClient
        .invalidateQueries(
          orpc.assignments.judgePool.queryOptions({ input: { eventId } })
        )
        .catch(() => undefined);
      queryClient
        .invalidateQueries(
          orpc.scoring.allScores.queryOptions({ input: { eventId } })
        )
        .catch(() => undefined);
      setSelected([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Assignment failed");
    }
  }, [assignMutation, eventId, queryClient, reviews, selected]);

  if (poolStatus === "pending") {
    return (
      <Card variant="default">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {(["a", "b", "c", "d"] as const).map((k) => (
            <Skeleton className="h-9 w-full" key={k} />
          ))}
        </CardContent>
      </Card>
    );
  }

  const judges = pool ?? [];

  return (
    <Card variant="default">
      <CardHeader>
        <CardTitle>Assign judges</CardTitle>
        <CardDescription>
          Coverage is balanced against judge load rather than filled one judge
          at a time, so every project is reviewed to the same depth wherever the
          pool allows.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {judges.length === 0 ? (
          <Alert
            description="No users hold the judge role yet, so there is nobody to assign. Give someone the judge role first, then return here."
            title="No judges available"
            variant="warning"
          />
        ) : (
          <JudgePoolList
            judges={judges}
            onChange={handleSelectionChange}
            selected={selected}
          />
        )}

        <Separator />

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="w-32">
            <Label className="mb-1.5 block text-xs" htmlFor="reviews-target">
              Reviews per project
            </Label>
            <Input
              id="reviews-target"
              max={50}
              min={1}
              onChange={handleReviewsChange}
              type="number"
              value={reviews}
            />
          </div>
          <Button
            className="gap-2"
            disabled={selected.length === 0 || assignMutation.isPending}
            onClick={handleAssign}
          >
            <ScaleIcon className="size-4" />
            {assignMutation.isPending ? "Assigning…" : "Run batch assign"}
          </Button>
        </div>

        {result ? <AssignResultPanel result={result} /> : null}
      </CardContent>
    </Card>
  );
}

function JudgePoolList({
  judges,
  selected,
  onChange,
}: {
  judges: JudgePoolEntry[];
  onChange: (judgeIds: string[]) => void;
  selected: string[];
}) {
  const items = useMemo(
    () =>
      judges.map((judge) => ({
        label: `${judge.name} · ${judge.assignedCount} assigned`,
        value: judge.id,
      })),
    [judges]
  );

  return (
    <div className="space-y-2">
      <Label className="font-medium text-foreground text-sm">
        Judge pool
        <span className="ml-2 font-normal text-muted-foreground">
          {selected.length} of {judges.length} selected
        </span>
      </Label>
      <Combobox
        items={items}
        multiple
        onValueChange={onChange}
        value={selected}
      >
        <ComboboxChips>
          <ComboboxChipsInput placeholder="Search judges by name…" />
        </ComboboxChips>
        <ComboboxContent>
          <ComboboxEmpty>No judge matches that search.</ComboboxEmpty>
          <ComboboxList>
            {items.map((item) => (
              <ComboboxItem key={item.value} value={item.value}>
                {item.label}
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <p className="text-muted-foreground text-xs">
        The batch pass balances coverage against load, so every project is
        reviewed to the same depth wherever this pool allows.
      </p>
    </div>
  );
}

function AssignResultPanel({ result }: { result: BatchResult }) {
  const skipsByReason = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const s of result.details.skipped) {
      grouped.set(s.reason, (grouped.get(s.reason) ?? 0) + 1);
    }
    return [...grouped.entries()].sort((a, b) => b[1] - a[1]);
  }, [result.details.skipped]);

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="success">{result.assigned} assigned</Badge>
        <Badge variant={result.skipped > 0 ? "warning" : "outline"}>
          {result.skipped} skipped
        </Badge>
      </div>
      {skipsByReason.length > 0 ? (
        <>
          <p className="flex items-center gap-1.5 font-medium text-sm">
            <TriangleAlertIcon className="size-3.5 text-warning" />
            Why assignments were skipped
          </p>
          <ul className="space-y-1 text-muted-foreground text-sm">
            {skipsByReason.map(([reason, count]) => (
              <li className="flex justify-between gap-4" key={reason}>
                <span>{reason.replaceAll("_", " ")}</span>
                <span className="shrink-0 tabular-nums">{count}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

// ─── Scores ───────────────────────────────────────────────────────────────────

function SingleAssignSection({
  eventId,
  pool,
  submissions,
}: {
  eventId: string;
  pool: JudgePoolEntry[] | undefined;
  submissions: GalleryRow[];
}) {
  const queryClient = useQueryClient();
  const [submissionId, setSubmissionId] = useState("");
  const [judgeId, setJudgeId] = useState("");

  const assignMutation = useMutation(orpc.assignments.assign.mutationOptions());
  const items = useMemo(
    () =>
      (pool ?? []).map((judge) => ({
        label: judge.name,
        value: judge.id,
      })),
    [pool]
  );
  const projectItems = useMemo(
    () => submissions.map((s) => ({ label: s.name, value: s.id })),
    [submissions]
  );

  const handleAssign = useCallback(async () => {
    if (!(submissionId && judgeId)) {
      return;
    }
    try {
      await assignMutation.mutateAsync({ eventId, judgeId, submissionId });
      toast.success("Judge assigned");
      queryClient
        .invalidateQueries(
          orpc.assignments.progress.queryOptions({ input: { eventId } })
        )
        .catch(() => undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not assign");
    }
  }, [assignMutation, eventId, judgeId, queryClient, submissionId]);

  const handleJudgeChange = useCallback((next: string | null) => {
    setJudgeId(next ?? "");
  }, []);

  const handleProjectChange = useCallback((next: string | null) => {
    setSubmissionId(next ?? "");
  }, []);

  const selectedProject = projectItems.find((p) => p.value === submissionId);

  return (
    <Card variant="default">
      <CardHeader>
        <CardTitle>Single assignment</CardTitle>
        <CardDescription>
          Add one judge to one project, for a coverage gap the batch pass could
          not fill — a late judge, or one added after assignment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {projectItems.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No submitted projects to assign against yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Combobox
              items={projectItems}
              onValueChange={handleProjectChange}
              value={submissionId}
            >
              <ComboboxChips>
                <ComboboxChipsInput placeholder="Choose a project…" />
              </ComboboxChips>
              <ComboboxContent>
                <ComboboxEmpty>No project matches.</ComboboxEmpty>
                <ComboboxList>
                  {projectItems.map((item) => (
                    <ComboboxItem key={item.value} value={item.value}>
                      {item.label}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            <Combobox
              items={items}
              onValueChange={handleJudgeChange}
              value={judgeId}
            >
              <ComboboxChips>
                <ComboboxChipsInput placeholder="Choose a judge…" />
              </ComboboxChips>
              <ComboboxContent>
                <ComboboxEmpty>No judge matches.</ComboboxEmpty>
                <ComboboxList>
                  {items.map((item) => (
                    <ComboboxItem key={item.value} value={item.value}>
                      {item.label}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            <Button
              disabled={assignMutation.isPending || !submissionId || !judgeId}
              onClick={handleAsync(handleAssign)}
            >
              {assignMutation.isPending ? "Assigning…" : "Assign"}
            </Button>
          </div>
        )}

        {selectedProject ? (
          <Alert
            description={`Coverage for “${selectedProject.label}” is set by the batch pass above. Per-judge counts for this project are not available from the API, so use the progress table above to see who is still outstanding.`}
            title="Per-project coverage"
            variant="info"
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function ScoresSection({
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
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-1 text-xs">
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
