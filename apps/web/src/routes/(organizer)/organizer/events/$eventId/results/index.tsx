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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rave/ui/components/dialog";
import { Label } from "@rave/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@rave/ui/components/select";
import { Skeleton } from "@rave/ui/components/skeleton";
import { Switch } from "@rave/ui/components/switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon, LockIcon, RocketIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { type client, orpc } from "@/utils/orpc";

// ─── Types ────────────────────────────────────────────────────────────────────

type AdminResult = Awaited<ReturnType<typeof client.results.getAdmin>>[number];
type PublishedResult = Awaited<
  ReturnType<typeof client.results.getPublished>
>["results"][number];
type RubricRow = Awaited<ReturnType<typeof client.rubrics.listByEvent>>[number];
type Track = Awaited<ReturnType<typeof client.tracks.list>>[number];

const ALL_TRACKS = "__all__";

function trackName(
  tracks: Track[] | undefined,
  trackId: string | null
): string {
  if (!trackId) {
    return "Untracked";
  }
  return tracks?.find((t) => t.id === trackId)?.name ?? "Unknown track";
}

function fmt(value: string | null, digits = 2): string {
  if (value === null) {
    return "—";
  }
  const n = Number(value);
  return Number.isNaN(n) ? "—" : n.toFixed(digits);
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute(
  "/(organizer)/organizer/events/$eventId/results/"
)({
  component: ResultsPage,
});

// ─── Page ─────────────────────────────────────────────────────────────────────

function ResultsPage() {
  const { eventId } = Route.useParams();
  const [trackFilter, setTrackFilter] = useState<string>(ALL_TRACKS);
  const [confirm, setConfirm] = useState<"lock" | "reveal" | null>(null);

  const trackId = trackFilter === ALL_TRACKS ? undefined : trackFilter;

  const tracksQuery = useQuery(
    orpc.tracks.list.queryOptions({ input: { eventId } })
  );
  const rubricsQuery = useQuery(
    orpc.rubrics.listByEvent.queryOptions({ input: { eventId } })
  );
  const adminQuery = useQuery(
    orpc.results.getAdmin.queryOptions({ input: { eventId, trackId } })
  );
  const publishedQuery = useQuery(
    orpc.results.getPublished.queryOptions({
      input: { eventId, limit: 100, page: 1, trackId },
    })
  );

  const handleTrackFilterChange = useCallback((value: string | null) => {
    setTrackFilter(value ?? ALL_TRACKS);
  }, []);

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
          Results
        </h1>
        <p className="text-muted-foreground">
          Compute normalized results, lock the score set, then publish.
        </p>
      </header>

      <TrackFilterBar
        onChange={handleTrackFilterChange}
        tracks={tracksQuery.data}
        value={trackFilter}
      />

      <ComputeCard
        eventId={eventId}
        rubrics={rubricsQuery.data}
        trackId={trackId}
      />

      <LifecycleCard onConfirm={setConfirm} />

      <AdminResultsCard
        results={adminQuery.data ?? []}
        status={adminQuery.status}
        tracks={tracksQuery.data}
      />

      <PublicPreviewCard
        results={publishedQuery.data?.results ?? []}
        status={publishedQuery.status}
      />

      <ConfirmDialog
        eventId={eventId}
        onClose={handleDialogClose(setConfirm)}
        open={confirm !== null}
        which={confirm}
      />
    </div>
  );
}

function handleDialogClose(
  setConfirm: (next: "lock" | "reveal" | null) => void
) {
  return () => {
    setConfirm(null);
  };
}

// ─── Track filter ─────────────────────────────────────────────────────────────

function TrackFilterBar({
  tracks,
  value,
  onChange,
}: {
  onChange: (value: string | null) => void;
  tracks: Track[] | undefined;
  value: string;
}) {
  return (
    <div className="w-full sm:w-64">
      <Label className="mb-1.5 block text-xs" htmlFor="track-filter">
        Track
      </Label>
      <Select onValueChange={onChange} value={value}>
        <SelectTrigger id="track-filter" />
        <SelectContent>
          <SelectItem value={ALL_TRACKS}>All tracks</SelectItem>
          {(tracks ?? []).map((track) => (
            <SelectItem key={track.id} value={track.id}>
              {track.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Compute ──────────────────────────────────────────────────────────────────

function ComputeCard({
  eventId,
  rubrics,
  trackId,
}: {
  eventId: string;
  rubrics: RubricRow[] | undefined;
  trackId: string | undefined;
}) {
  const queryClient = useQueryClient();
  const [rubricId, setRubricId] = useState("");
  const [useNormalization, setUseNormalization] = useState(true);

  const eligible = useMemo(
    () =>
      (rubrics ?? []).filter(
        (r) => !trackId || r.trackId === trackId || r.trackId === null
      ),
    [rubrics, trackId]
  );

  const selected = eligible.find((r) => r.id === rubricId) ?? eligible[0];

  const computeMutation = useMutation(orpc.results.compute.mutationOptions());

  const handleRubricChange = useCallback((value: string | null) => {
    setRubricId(value ?? "");
  }, []);

  const handleNormalizationChange = useCallback((checked: boolean) => {
    setUseNormalization(checked);
  }, []);

  const handleCompute = useCallback(async () => {
    if (!selected) {
      return;
    }
    try {
      await computeMutation.mutateAsync({
        eventId,
        rubricId: selected.id,
        trackId,
        useNormalization,
      });
      toast.success("Results computed");
      queryClient
        .invalidateQueries(
          orpc.results.getAdmin.queryOptions({ input: { eventId } })
        )
        .catch(() => undefined);
      queryClient
        .invalidateQueries(
          orpc.results.getPublished.queryOptions({
            input: { eventId, limit: 100, page: 1 },
          })
        )
        .catch(() => undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Compute failed");
    }
  }, [
    computeMutation,
    eventId,
    queryClient,
    selected,
    trackId,
    useNormalization,
  ]);

  return (
    <Card variant="default">
      <CardHeader>
        <CardTitle>Compute results</CardTitle>
        <CardDescription>
          Scores are normalized per judge with a z-score before aggregation, so
          one generous judge cannot dominate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {eligible.length === 0 ? (
          <Alert
            description="Results need a rubric. Create one for this event before computing."
            title="No rubric yet"
            variant="warning"
          />
        ) : (
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-56 flex-1">
              <Label className="mb-1.5 block text-xs" htmlFor="rubric-select">
                Rubric
              </Label>
              <Select
                onValueChange={handleRubricChange}
                value={selected?.id ?? null}
              >
                <SelectTrigger id="rubric-select" />
                <SelectContent>
                  {eligible.map((rubric) => (
                    <SelectItem key={rubric.id} value={rubric.id}>
                      {rubric.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2.5 pb-2">
              <Switch
                checked={useNormalization}
                id="use-normalization"
                onCheckedChange={handleNormalizationChange}
              />
              <label
                className="cursor-pointer text-sm"
                htmlFor="use-normalization"
              >
                Normalize per judge
              </label>
            </div>
            <Button
              disabled={computeMutation.isPending || !selected}
              onClick={handleCompute}
            >
              {computeMutation.isPending ? "Computing…" : "Compute results"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

function LifecycleCard({
  onConfirm,
}: {
  onConfirm: (which: "lock" | "reveal") => void;
}) {
  return (
    <Card variant="default">
      <CardHeader>
        <CardTitle>Finalize</CardTitle>
        <CardDescription>
          Both actions are recorded in the audit log and cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button
          className="gap-2"
          onClick={handleLifecycleClick(onConfirm, "lock")}
          variant="outline"
        >
          <LockIcon className="size-4" />
          Lock scores
        </Button>
        <Button
          className="gap-2"
          onClick={handleLifecycleClick(onConfirm, "reveal")}
        >
          <RocketIcon className="size-4" />
          Publish results
        </Button>
      </CardContent>
    </Card>
  );
}

function handleLifecycleClick(
  onConfirm: (which: "lock" | "reveal") => void,
  which: "lock" | "reveal"
) {
  return () => {
    onConfirm(which);
  };
}

// ─── Admin results ────────────────────────────────────────────────────────────

function AdminResultsCard({
  results,
  tracks,
  status,
}: {
  results: AdminResult[];
  status: "error" | "pending" | "success";
  tracks: Track[] | undefined;
}) {
  if (status === "pending") {
    return <ResultsSkeleton />;
  }

  if (results.length === 0) {
    return (
      <Card variant="default">
        <CardHeader>
          <CardTitle>Computed results</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-muted-foreground text-sm">
            No results stored yet. Compute them above once judging is done.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="default">
      <CardHeader>
        <CardTitle>Computed results</CardTitle>
        <CardDescription>
          Organizer view, including the raw and normalized scores judges cannot
          see.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border border-b text-left text-muted-foreground text-xs">
                <th className="pb-2 font-medium" scope="col">
                  Rank
                </th>
                <th className="pb-2 font-medium" scope="col">
                  Project
                </th>
                <th className="pb-2 font-medium" scope="col">
                  Track
                </th>
                <th className="pb-2 text-right font-medium" scope="col">
                  Raw
                </th>
                <th className="pb-2 text-right font-medium" scope="col">
                  Normalized
                </th>
                <th className="pb-2 text-right font-medium" scope="col">
                  Final
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <AdminResultRow key={row.id} row={row} tracks={tracks} />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminResultRow({
  row,
  tracks,
}: {
  row: AdminResult;
  tracks: Track[] | undefined;
}) {
  return (
    <tr className="border-border/60 border-b last:border-0">
      <td className="py-2.5 pr-3 font-medium tabular-nums">
        {row.rank ?? "—"}
      </td>
      <td className="py-2.5 pr-3 font-mono text-xs">
        {row.submissionId.slice(0, 10)}
      </td>
      <td className="py-2.5 pr-3 text-muted-foreground text-xs">
        {trackName(tracks, row.trackId)}
      </td>
      <td className="py-2.5 text-right text-muted-foreground tabular-nums">
        {fmt(row.rawScore)}
      </td>
      <td className="py-2.5 text-right text-muted-foreground tabular-nums">
        {fmt(row.normalizedScore)}
      </td>
      <td className="py-2.5 text-right font-medium tabular-nums">
        {fmt(row.finalScore)}
      </td>
    </tr>
  );
}

// ─── Public preview ───────────────────────────────────────────────────────────

function PublicPreviewCard({
  results,
  status,
}: {
  results: PublishedResult[];
  status: "error" | "pending" | "success";
}) {
  if (status === "pending") {
    return <ResultsSkeleton />;
  }

  return (
    <Card variant="default">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Public preview</CardTitle>
            <CardDescription>
              Exactly what participants see once results are published.
            </CardDescription>
          </div>
          <Badge variant="outline">{results.length} shown</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {results.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground text-sm">
            Nothing to preview yet. Publish results to populate this view.
          </p>
        ) : (
          <ol className="space-y-2">
            {results.map((row) => (
              <li
                className="flex items-center justify-between gap-4 rounded-lg border border-border px-3.5 py-2.5"
                key={row.id}
              >
                <span className="flex items-center gap-3">
                  <Badge variant={row.rank === 1 ? "default" : "subtle"}>
                    #{row.rank ?? "—"}
                  </Badge>
                  <span className="font-mono text-xs">
                    {row.submissionId.slice(0, 10)}
                  </span>
                </span>
                <span className="text-xs">
                  {row.scoreBreakdown
                    ? `${Object.keys(row.scoreBreakdown).length} criteria`
                    : "—"}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  eventId,
  open,
  which,
  onClose,
}: {
  eventId: string;
  onClose: () => void;
  open: boolean;
  which: "lock" | "reveal" | null;
}) {
  const queryClient = useQueryClient();
  const lockMutation = useMutation(orpc.scoring.lockScores.mutationOptions());
  const revealMutation = useMutation(
    orpc.events.revealResults.mutationOptions()
  );

  const isLock = which === "lock";
  const isPending = lockMutation.isPending || revealMutation.isPending;

  const handleConfirm = useCallback(async () => {
    try {
      if (isLock) {
        await lockMutation.mutateAsync({ eventId });
        toast.success("Scores locked");
        queryClient
          .invalidateQueries(
            orpc.scoring.allScores.queryOptions({ input: { eventId } })
          )
          .catch(() => undefined);
      } else {
        await revealMutation.mutateAsync({ eventId });
        toast.success("Results published");
        queryClient
          .invalidateQueries(
            orpc.results.getPublished.queryOptions({
              input: { eventId, limit: 100, page: 1 },
            })
          )
          .catch(() => undefined);
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  }, [eventId, isLock, lockMutation, onClose, queryClient, revealMutation]);

  return (
    <Dialog onOpenChange={handleOpenChange(onClose)} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isLock ? "Lock all scores?" : "Publish results?"}
          </DialogTitle>
          <DialogDescription>
            {isLock
              ? "Every score on this event becomes read-only. Judges will no longer be able to edit or resubmit anything."
              : "Results become visible to everyone, including participants who never judged. This cannot be undone."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button disabled={isPending} onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button disabled={isPending} onClick={handleConfirm}>
            {confirmLabel(isPending, isLock)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function confirmLabel(isPending: boolean, isLock: boolean): string {
  if (isPending) {
    return "Working…";
  }
  if (isLock) {
    return "Lock scores";
  }
  return "Publish results";
}

function handleOpenChange(onClose: () => void) {
  return (next: boolean) => {
    if (!next) {
      onClose();
    }
  };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ResultsSkeleton() {
  return (
    <Card variant="default">
      <CardHeader>
        <Skeleton className="h-5 w-44" />
      </CardHeader>
      <CardContent className="space-y-3">
        {(["a", "b", "c", "d"] as const).map((k) => (
          <Skeleton className="h-11 w-full" key={k} />
        ))}
      </CardContent>
    </Card>
  );
}
