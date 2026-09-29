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
import { Separator } from "@rave/ui/components/separator";
import { Skeleton } from "@rave/ui/components/skeleton";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ScaleIcon, TriangleAlertIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { orpc } from "@/utils/orpc";
import type { BatchResult, JudgePoolEntry } from "./shared";

/**
 * Bulk assignment across the judge pool.
 *
 * The pass balances coverage against load rather than filling one judge at a
 * time, so every project is reviewed to the same depth wherever the pool allows.
 * Skips are reported grouped by reason: that grouping is the audit trail for a
 * coverage decision, not just a count.
 */

export function BatchAssignPanel({
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
