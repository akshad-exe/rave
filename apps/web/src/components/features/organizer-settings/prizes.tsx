import { Badge } from "@rave/ui/components/badge";
import { Button } from "@rave/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rave/ui/components/card";
import { Input } from "@rave/ui/components/input";
import { Separator } from "@rave/ui/components/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@rave/ui/components/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2Icon } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { handleAsync, handleClear, handleInputChange } from "@/lib/handlers";
import { orpc } from "@/utils/orpc";
import { ConfirmDeleteDialog, type Prize } from "./shared";

/**
 * Prizes: the awards shown on the results page, optionally scoped to a track.
 * Previously this surface did not exist at all, not even a read, so an organizer
 * had no way to attach a prize to the event they had just created.
 */
export function PrizesPanel({ eventId }: { eventId: string }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [trackId, setTrackId] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Prize | null>(null);

  const prizesQuery = useQuery(
    orpc.prizes.list.queryOptions({ input: { eventId } })
  );
  const tracksQuery = useQuery(
    orpc.tracks.list.queryOptions({ input: { eventId } })
  );
  const createMutation = useMutation(orpc.prizes.create.mutationOptions());
  const deleteMutation = useMutation(orpc.prizes.delete.mutationOptions());

  const refresh = useCallback(() => {
    queryClient
      .invalidateQueries(orpc.prizes.list.queryOptions({ input: { eventId } }))
      .catch(() => undefined);
  }, [eventId, queryClient]);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      toast.error("Prize name is required");
      return;
    }
    try {
      await createMutation.mutateAsync({
        currency: currency.trim() || "USD",
        eventId,
        name: name.trim(),
        sortOrder: prizesQuery.data?.length ?? 0,
        trackId: trackId || undefined,
        value: value.trim() || undefined,
      });
      toast.success("Prize created");
      setName("");
      setValue("");
      setTrackId("");
      refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not create prize"
      );
    }
  }, [
    createMutation,
    currency,
    eventId,
    name,
    prizesQuery.data,
    refresh,
    trackId,
    value,
  ]);

  const handleDelete = useCallback(async () => {
    if (!pendingDelete) {
      return;
    }
    try {
      await deleteMutation.mutateAsync({ prizeId: pendingDelete.id });
      toast.success("Prize deleted");
      setPendingDelete(null);
      refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not delete prize"
      );
    }
  }, [deleteMutation, pendingDelete, refresh]);

  const prizes = prizesQuery.data ?? [];
  const tracks = tracksQuery.data ?? [];
  const trackNameById = new Map(tracks.map((t) => [t.id, t.name]));

  return (
    <Card variant="default">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Prizes</CardTitle>
            <CardDescription>
              Awards on the results page, optionally scoped to a track.
            </CardDescription>
          </div>
          <Badge variant="outline">{prizes.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {prizes.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No prizes yet. They appear on the public results page once results
            are published.
          </p>
        ) : (
          <div className="overflow-x-auto rounded border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prize</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prizes.map((prize) => (
                  <PrizeRow
                    key={prize.id}
                    onDelete={setPrizeDelete(setPendingDelete)}
                    prize={prize}
                    trackName={
                      prize.trackId
                        ? trackNameById.get(prize.trackId)
                        : undefined
                    }
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Separator />

        <div className="grid gap-3 sm:grid-cols-[1fr_9rem_7rem_auto]">
          <Input
            onChange={handleInputChange(setName)}
            placeholder="Prize name"
            value={name}
          />
          <Input
            onChange={handleInputChange(setValue)}
            placeholder="Value"
            value={value}
          />
          <Input
            maxLength={10}
            onChange={handleInputChange(setCurrency)}
            placeholder="USD"
            value={currency}
          />
          <Button
            disabled={createMutation.isPending || name.trim().length === 0}
            onClick={handleAsync(handleCreate)}
          >
            Add prize
          </Button>
        </div>
        <Input
          list="track-options"
          onChange={handleInputChange(setTrackId)}
          placeholder="Track (optional)"
          value={trackId}
        />
        <datalist id="track-options">
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </datalist>
      </CardContent>

      <ConfirmDeleteDialog
        busy={deleteMutation.isPending}
        description={
          pendingDelete
            ? `“${pendingDelete.name}” will be removed from this event.`
            : ""
        }
        onClose={handleClear(setPendingDelete)}
        onConfirm={handleAsync(handleDelete)}
        open={pendingDelete !== null}
        title="Delete this prize?"
      />
    </Card>
  );
}

function setPrizeDelete(setter: (p: Prize | null) => void) {
  return (prize: Prize) => {
    setter(prize);
  };
}

export function PrizeRow({
  prize,
  trackName,
  onDelete,
}: {
  onDelete: (prize: Prize) => void;
  prize: Prize;
  trackName: string | undefined;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{prize.name}</TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {prize.value ? `${prize.value} ${prize.currency}` : "—"}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {trackName ?? "All tracks"}
      </TableCell>
      <TableCell>
        <div className="flex justify-end">
          <button
            aria-label={`Delete ${prize.name}`}
            className="rounded p-1.5 text-muted-foreground hover:bg-error/10 hover:text-error"
            onClick={prizeDeleteAction(onDelete, prize)}
            type="button"
          >
            <Trash2Icon className="size-4" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function prizeDeleteAction(onDelete: (p: Prize) => void, prize: Prize) {
  return () => {
    onDelete(prize);
  };
}
