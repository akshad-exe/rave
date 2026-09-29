import { Alert } from "@rave/ui/components/alert";
import { Badge } from "@rave/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rave/ui/components/card";
import { Progress } from "@rave/ui/components/progress";
import { ScrollArea } from "@rave/ui/components/scroll-area";
import { Skeleton } from "@rave/ui/components/skeleton";
import {
  type JudgePoolEntry,
  type JudgeProgress,
  judgeName,
  type ProgressOverview,
} from "./shared";

/**
 * Per-judge completion.
 *
 * Capped at 96px and scrolled: the fixture has 30 judges and the schema sets no
 * ceiling, so an uncapped table pushes the batch-assign panel below the fold.
 */

export function ProgressPanel({
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
