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
import { Input } from "@rave/ui/components/input";
import { Label } from "@rave/ui/components/label";
import { Separator } from "@rave/ui/components/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@rave/ui/components/table";
import { Textarea } from "@rave/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilIcon, Trash2Icon } from "lucide-react";
import type * as React from "react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  handleAsync,
  handleClear,
  handleDialogClose,
  handleInputChange,
} from "@/lib/handlers";
import { orpc } from "@/utils/orpc";
import { ConfirmDeleteDialog, type Track } from "./shared";

/**
 * Tracks: the categories a project competes in, created and edited after the
 * event exists. Deleting one strips the grouping from its projects and makes
 * its rubric unselectable, so the confirmation says so rather than just
 * "are you sure".
 */
export function TracksPanel({ eventId }: { eventId: string }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxSubmissions, setMaxSubmissions] = useState("");
  const [editing, setEditing] = useState<Track | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Track | null>(null);

  const tracksQuery = useQuery(
    orpc.tracks.list.queryOptions({ input: { eventId } })
  );
  const createMutation = useMutation(orpc.tracks.create.mutationOptions());
  const updateMutation = useMutation(orpc.tracks.update.mutationOptions());
  const deleteMutation = useMutation(orpc.tracks.delete.mutationOptions());

  const refresh = useCallback(() => {
    queryClient
      .invalidateQueries(orpc.tracks.list.queryOptions({ input: { eventId } }))
      .catch(() => undefined);
  }, [eventId, queryClient]);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      toast.error("Track name is required");
      return;
    }
    try {
      await createMutation.mutateAsync({
        description: description.trim() || undefined,
        eventId,
        maxSubmissions: maxSubmissions
          ? Number.parseInt(maxSubmissions, 10)
          : undefined,
        name: name.trim(),
        sortOrder: tracksQuery.data?.length ?? 0,
      });
      toast.success("Track created");
      setName("");
      setDescription("");
      setMaxSubmissions("");
      refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not create track"
      );
    }
  }, [
    createMutation,
    description,
    eventId,
    maxSubmissions,
    name,
    refresh,
    tracksQuery.data,
  ]);

  const handleSaveEdit = useCallback(async () => {
    if (!editing) {
      return;
    }
    try {
      await updateMutation.mutateAsync({
        description: editing.description ?? undefined,
        // Empty means unlimited, which the API expresses as an explicit null
        // rather than an omitted key.
        maxSubmissions: editing.maxSubmissions ?? null,
        name: editing.name,
        sortOrder: editing.sortOrder,
        trackId: editing.id,
      });
      toast.success("Track updated");
      setEditing(null);
      refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update track"
      );
    }
  }, [editing, refresh, updateMutation]);

  const handleDelete = useCallback(async () => {
    if (!pendingDelete) {
      return;
    }
    try {
      await deleteMutation.mutateAsync({ trackId: pendingDelete.id });
      toast.success("Track deleted");
      setPendingDelete(null);
      refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not delete track"
      );
    }
  }, [deleteMutation, pendingDelete, refresh]);

  const tracks = tracksQuery.data ?? [];

  return (
    <Card variant="default">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Tracks</CardTitle>
            <CardDescription>
              Categories projects compete in. A project sits in exactly one.
            </CardDescription>
          </div>
          <Badge variant="outline">{tracks.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {tracks.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No tracks yet. Projects can still be submitted, they just will not
            be grouped.
          </p>
        ) : (
          <div className="overflow-x-auto rounded border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Max submissions</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tracks.map((track) => (
                  <TrackRow
                    key={track.id}
                    onDelete={setTrackDelete(setPendingDelete)}
                    onEdit={setTrackEdit(setEditing)}
                    track={track}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Separator />

        <div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto]">
          <Input
            onChange={handleInputChange(setName)}
            placeholder="New track name"
            value={name}
          />
          <Input
            onChange={handleInputChange(setMaxSubmissions)}
            placeholder="Unlimited"
            type="number"
            value={maxSubmissions}
          />
          <Button
            disabled={createMutation.isPending || name.trim().length === 0}
            onClick={handleAsync(handleCreate)}
          >
            Add track
          </Button>
        </div>
        <Textarea
          onChange={handleInputChange(setDescription)}
          placeholder="Optional description"
          rows={2}
          value={description}
        />
      </CardContent>

      <EditTrackDialog
        editing={editing}
        onChange={setTrackField(setEditing)}
        onClose={handleClear(setEditing)}
        onSave={handleAsync(handleSaveEdit)}
        pending={updateMutation.isPending}
      />
      <ConfirmDeleteDialog
        busy={deleteMutation.isPending}
        description={
          pendingDelete
            ? `“${pendingDelete.name}” will be removed. Projects in this track lose their grouping, and its rubric is no longer selectable.`
            : ""
        }
        onClose={handleClear(setPendingDelete)}
        onConfirm={handleAsync(handleDelete)}
        open={pendingDelete !== null}
        title="Delete this track?"
      />
    </Card>
  );
}

function setTrackDelete(setter: (t: Track | null) => void) {
  return (track: Track) => {
    setter(track);
  };
}

function setTrackEdit(
  setter: React.Dispatch<React.SetStateAction<Track | null>>
) {
  return (track: Track) => {
    setter({ ...track });
  };
}

function setTrackField(
  setter: React.Dispatch<React.SetStateAction<Track | null>>
) {
  return (patch: Partial<Track>) => {
    setter((prev) => (prev ? { ...prev, ...patch } : prev));
  };
}

export function TrackRow({
  track,
  onEdit,
  onDelete,
}: {
  onDelete: (track: Track) => void;
  onEdit: (track: Track) => void;
  track: Track;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{track.name}</TableCell>
      <TableCell className="max-w-64 truncate text-muted-foreground text-xs">
        {track.description || "—"}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {track.maxSubmissions ?? "Unlimited"}
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-1">
          <button
            aria-label={`Rename ${track.name}`}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onEditAction(onEdit, track)}
            type="button"
          >
            <PencilIcon className="size-4" />
          </button>
          <button
            aria-label={`Delete ${track.name}`}
            className="rounded p-1.5 text-muted-foreground hover:bg-error/10 hover:text-error"
            onClick={onDeleteAction(onDelete, track)}
            type="button"
          >
            <Trash2Icon className="size-4" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function onEditAction(onEdit: (t: Track) => void, track: Track) {
  return () => {
    onEdit(track);
  };
}

function onDeleteAction(onDelete: (t: Track) => void, track: Track) {
  return () => {
    onDelete(track);
  };
}

function EditTrackDialog({
  editing,
  onChange,
  onSave,
  onClose,
  pending,
}: {
  editing: Track | null;
  onChange: (patch: Partial<Track>) => void;
  onClose: () => void;
  onSave: () => void;
  pending: boolean;
}) {
  return (
    <Dialog onOpenChange={handleDialogClose(onClose)} open={editing !== null}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename track</DialogTitle>
          <DialogDescription>
            Changing a cap does not move projects already in this track, and
            lowering it below the current count leaves the track over its limit
            until organizers move projects out.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label className="block text-xs" htmlFor="edit-track-name">
            Name
          </Label>
          <Input
            id="edit-track-name"
            onChange={handleEditName(onChange, editing)}
            value={editing?.name ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="block text-xs" htmlFor="edit-track-max">
            Max submissions
          </Label>
          <Input
            id="edit-track-max"
            min={1}
            onChange={handleEditMax(onChange, editing)}
            placeholder="Unlimited"
            type="number"
            value={editing?.maxSubmissions ?? ""}
          />
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button disabled={pending} onClick={onSave}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function handleEditMax(
  onChange: (patch: Partial<Track>) => void,
  editing: Track | null
) {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editing) {
      return;
    }
    const parsed = Number.parseInt(e.target.value, 10);
    onChange({ maxSubmissions: Number.isNaN(parsed) ? null : parsed });
  };
}

function handleEditName(
  onChange: (patch: Partial<Track>) => void,
  editing: Track | null
) {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editing) {
      onChange({ name: e.target.value });
    }
  };
}
