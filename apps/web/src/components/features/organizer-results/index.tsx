import { Button } from "@rave/ui/components/button";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { orpc } from "@/utils/orpc";
import { ComputePanel } from "./compute";
import { LifecyclePanel } from "./lifecycle";
import { ALL_TRACKS, type Track } from "./shared";
import { AdminResultsPanel, PublicPreviewPanel } from "./tables";

/**
 * Results: compute them, inspect them, lock the score set, publish.
 *
 * The dialog lives here rather than in either panel because it serves both
 * irreversible actions and needs the event id and the two mutations that both
 * panels invalidate.
 */
export function ResultsPage({ eventId }: { eventId: string }) {
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

  const handleTrackChange = useCallback((value: string | null) => {
    setTrackFilter(value ?? ALL_TRACKS);
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-1">
        <a
          className="mb-2 flex w-fit items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
          href="/organizer/events"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to events
        </a>
        <h1 className="font-bold font-display text-3xl text-foreground">
          Results
        </h1>
        <p className="text-muted-foreground">
          Compute normalized results, lock the score set, then publish.
        </p>
      </header>

      <TrackFilterBar
        onChange={handleTrackChange}
        tracks={tracksQuery.data}
        value={trackFilter}
      />

      <ComputePanel
        eventId={eventId}
        rubrics={rubricsQuery.data}
        trackId={trackId}
      />
      <LifecyclePanel onConfirm={setConfirm} />

      <AdminResultsPanel
        results={adminQuery.data ?? []}
        status={adminQuery.status}
        tracks={tracksQuery.data}
      />
      <PublicPreviewPanel
        results={publishedQuery.data?.results ?? []}
        status={publishedQuery.status}
      />

      <ConfirmLifecycleDialog
        eventId={eventId}
        onClose={handleCloseConfirm(setConfirm)}
        open={confirm !== null}
        which={confirm}
      />
    </div>
  );
}

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

function ConfirmLifecycleDialog({
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
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
          <Button disabled={isPending} onClick={handleAsync(handleConfirm)}>
            {confirmLabel(isPending, isLock)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function handleCloseConfirm(
  setConfirm: (next: "lock" | "reveal" | null) => void
) {
  return () => {
    setConfirm(null);
  };
}

function handleOpenChange(onClose: () => void) {
  return (open: boolean) => {
    if (!open) {
      onClose();
    }
  };
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

function handleAsync(fn: () => Promise<unknown>) {
  return () => {
    fn().catch(() => undefined);
  };
}
