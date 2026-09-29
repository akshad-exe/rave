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
import { Input } from "@rave/ui/components/input";
import { Label } from "@rave/ui/components/label";
import { Separator } from "@rave/ui/components/separator";
import { Switch } from "@rave/ui/components/switch";
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
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon, PencilIcon, Trash2Icon } from "lucide-react";
import type * as React from "react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { type client, orpc } from "@/utils/orpc";

// ─── Types ────────────────────────────────────────────────────────────────────

// getAdmin returns the event alongside its tracks and prizes, not a bare row.
type AdminEvent = Awaited<ReturnType<typeof client.events.getAdmin>>["event"];
type Track = Awaited<ReturnType<typeof client.tracks.list>>[number];
type Prize = Awaited<ReturnType<typeof client.prizes.list>>[number];

type DateFieldKey =
  | "endDate"
  | "judgingEndAt"
  | "judgingStartAt"
  | "registrationEndAt"
  | "registrationStartAt";

const DATE_FIELDS: Array<{ key: DateFieldKey; label: string }> = [
  { key: "registrationStartAt", label: "Registration opens" },
  { key: "registrationEndAt", label: "Registration closes" },
  { key: "judgingStartAt", label: "Judging opens" },
  { key: "judgingEndAt", label: "Judging closes" },
  { key: "endDate", label: "Event ends" },
];

/**
 * `updateEventInput` is `.partial()` over fields that carry defaults, so an
 * omitted key still resolves to its default rather than being left alone. Send
 * only what the organizer actually changed.
 */
interface EventDraft {
  allowIndividuals: boolean;
  description: string;
  isPublic: boolean;
  maxTeamSize: number;
  maxVotesPerUser: number;
  minTeamSize: number;
  name: string;
  slug: string;
  tagline: string;
  websiteUrl: string;
}

type DateDraft = Record<DateFieldKey, string>;

function toDateInputValue(value: Date | string | null | undefined): string {
  if (!value) {
    return "";
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIsoOrUndefined(value: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute(
  "/(organizer)/organizer/events/$eventId/settings/"
)({
  component: EventSettingsPage,
});

// ─── Page ─────────────────────────────────────────────────────────────────────

function EventSettingsPage() {
  const { eventId } = Route.useParams();
  const eventQuery = useQuery(
    orpc.events.getAdmin.queryOptions({ input: { eventId } })
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-col gap-1">
        <Link
          className="mb-2 flex w-fit items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
          to="/organizer/events"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to events
        </Link>
        <h1 className="font-bold font-display text-3xl text-foreground">
          Event settings
        </h1>
        <p className="text-muted-foreground">
          Change the details, schedule, tracks and prizes of this event.
        </p>
      </header>

      {renderEventState(eventQuery.status, eventQuery.data, eventId)}
    </div>
  );
}

function renderEventState(
  status: "error" | "pending" | "success",
  data: Awaited<ReturnType<typeof client.events.getAdmin>> | undefined,
  eventId: string
) {
  if (status === "pending") {
    return <SettingsPending />;
  }
  if (!data) {
    return (
      <Alert
        description="We could not load this event."
        title="Event unavailable"
        variant="destructive"
      />
    );
  }
  return <SettingsBody event={data.event} eventId={eventId} />;
}

function SettingsBody({
  event,
  eventId,
}: {
  event: AdminEvent;
  eventId: string;
}) {
  return (
    <>
      <EventDetailsCard event={event} eventId={eventId} />
      <TracksCard eventId={eventId} />
      <PrizesCard eventId={eventId} />
    </>
  );
}

// ─── Event details ────────────────────────────────────────────────────────────

function EventDetailsCard({
  event,
  eventId,
}: {
  event: AdminEvent;
  eventId: string;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<EventDraft>(() => ({
    allowIndividuals: event.allowIndividuals,
    description: event.description ?? "",
    isPublic: event.isPublic,
    maxTeamSize: event.maxTeamSize,
    maxVotesPerUser: event.maxVotesPerUser,
    minTeamSize: event.minTeamSize,
    name: event.name,
    slug: event.slug,
    tagline: event.tagline ?? "",
    websiteUrl: event.websiteUrl ?? "",
  }));
  const [dates, setDates] = useState<DateDraft>(() => ({
    endDate: toDateInputValue(event.endDate),
    judgingEndAt: toDateInputValue(event.judgingEndAt),
    judgingStartAt: toDateInputValue(event.judgingStartAt),
    registrationEndAt: toDateInputValue(event.registrationEndAt),
    registrationStartAt: toDateInputValue(event.registrationStartAt),
  }));

  const updateMutation = useMutation(orpc.events.update.mutationOptions());

  const patch = useCallback(
    <K extends keyof EventDraft>(key: K, value: EventDraft[K]) => {
      setDraft((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleDate = useCallback((key: DateFieldKey, value: string) => {
    setDates((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      // Only the date fields the organizer actually filled in are added; an
      // omitted key must stay omitted or the schema default overwrites it.
      const datesPayload: Partial<Record<DateFieldKey, string>> = {};
      for (const { key } of DATE_FIELDS) {
        const iso = toIsoOrUndefined(dates[key]);
        if (iso) {
          datesPayload[key] = iso;
        }
      }
      await updateMutation.mutateAsync({ ...draft, ...datesPayload, eventId });
      toast.success("Event updated");
      queryClient
        .invalidateQueries(
          orpc.events.getAdmin.queryOptions({ input: { eventId } })
        )
        .catch(() => undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }, [dates, draft, eventId, queryClient, updateMutation]);

  return (
    <Card variant="default">
      <CardHeader>
        <CardTitle>Details</CardTitle>
        <CardDescription>
          Name, description and visibility. The slug is the public URL, so
          changing it breaks links people have already shared.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Name"
            onChange={handleTextChange(patch, "name")}
            value={draft.name}
          />
          <TextField
            label="Tagline"
            onChange={handleTextChange(patch, "tagline")}
            value={draft.tagline}
          />
          <TextField
            label="Slug"
            onChange={handleTextChange(patch, "slug")}
            value={draft.slug}
          />
          <TextField
            label="Website URL"
            onChange={handleTextChange(patch, "websiteUrl")}
            value={draft.websiteUrl}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="block text-xs" htmlFor="event-description">
            Description
          </Label>
          <Textarea
            id="event-description"
            maxLength={10_000}
            onChange={handleTextChange(patch, "description")}
            rows={4}
            value={draft.description}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField
            label="Min team size"
            onChange={handleNumberChange(patch, "minTeamSize")}
            value={draft.minTeamSize}
          />
          <NumberField
            label="Max team size"
            onChange={handleNumberChange(patch, "maxTeamSize")}
            value={draft.maxTeamSize}
          />
          <NumberField
            label="Max votes per user"
            onChange={handleNumberChange(patch, "maxVotesPerUser")}
            value={draft.maxVotesPerUser}
          />
        </div>

        <div className="flex flex-wrap gap-5">
          <ToggleField
            checked={draft.isPublic}
            hint="Listed publicly and visible in the gallery"
            id="event-public"
            label="Public event"
            onChange={handleBooleanChange(patch, "isPublic")}
          />
          <ToggleField
            checked={draft.allowIndividuals}
            hint="Let people submit without forming a team"
            id="event-individuals"
            label="Allow individuals"
            onChange={handleBooleanChange(patch, "allowIndividuals")}
          />
        </div>

        <Separator />

        <div className="space-y-3">
          <h3 className="font-medium text-foreground text-sm">Schedule</h3>
          <p className="text-muted-foreground text-xs">
            Moving a deadline does not undo work already done against the old
            one. Judges and participants both see the change immediately.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {DATE_FIELDS.map((field) => (
              <DateFieldInput
                key={field.key}
                label={field.label}
                onChange={handleDateInputChange(handleDate, field.key)}
                value={dates[field.key]}
              />
            ))}
          </div>
        </div>
      </CardContent>
      <div className="flex items-center justify-end border-border border-t p-4">
        <Button
          disabled={updateMutation.isPending}
          onClick={handleSaveAsync(handleSave)}
        >
          {updateMutation.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </Card>
  );
}

function handleTextChange<K extends keyof EventDraft>(
  patch: <T extends keyof EventDraft>(key: T, value: EventDraft[T]) => void,
  key: K
) {
  return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    patch(key, e.target.value as EventDraft[K]);
  };
}

function handleNumberChange<K extends keyof EventDraft>(
  patch: <T extends keyof EventDraft>(key: T, value: EventDraft[T]) => void,
  key: K
) {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    patch(key, Number.parseInt(e.target.value, 10) as EventDraft[K]);
  };
}

function handleBooleanChange<K extends keyof EventDraft>(
  patch: <T extends keyof EventDraft>(key: T, value: EventDraft[T]) => void,
  key: K
) {
  return (checked: boolean) => {
    patch(key, checked as EventDraft[K]);
  };
}

function handleDateInputChange(
  handleDate: (key: DateFieldKey, value: string) => void,
  key: DateFieldKey
) {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    handleDate(key, e.target.value);
  };
}

function handleSaveAsync(save: () => Promise<void>) {
  return () => {
    save();
  };
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  value: string;
}) {
  const id = `field-${label.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <div className="space-y-1.5">
      <Label className="block text-xs" htmlFor={id}>
        {label}
      </Label>
      <Input id={id} onChange={onChange} value={value} />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  value: number;
}) {
  const id = `field-${label.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <div className="space-y-1.5">
      <Label className="block text-xs" htmlFor={id}>
        {label}
      </Label>
      <Input id={id} onChange={onChange} type="number" value={value} />
    </div>
  );
}

function DateFieldInput({
  label,
  value,
  onChange,
}: {
  label: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  value: string;
}) {
  const id = `field-${label.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <div className="space-y-1.5">
      <Label className="block text-xs" htmlFor={id}>
        {label}
      </Label>
      <Input id={id} onChange={onChange} type="datetime-local" value={value} />
    </div>
  );
}

function ToggleField({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  checked: boolean;
  hint: string;
  id: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Switch
        checked={checked}
        className="mt-0.5"
        id={id}
        onCheckedChange={onChange}
      />
      <label className="cursor-pointer" htmlFor={id}>
        <span className="block font-medium text-sm">{label}</span>
        <span className="block text-muted-foreground text-xs">{hint}</span>
      </label>
    </div>
  );
}

// ─── Tracks ───────────────────────────────────────────────────────────────────

function TracksCard({ eventId }: { eventId: string }) {
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
        onClose={handleClose(setEditing)}
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
        onClose={handleClose(setPendingDelete)}
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

function TrackRow({
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
    <Dialog onOpenChange={handleDialogOpen(onClose)} open={editing !== null}>
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

function handleDialogOpen(onClose: () => void) {
  return (next: boolean) => {
    if (!next) {
      onClose();
    }
  };
}

function handleClose<T>(setter: (value: T) => void) {
  return () => {
    setter(null as T);
  };
}

function handleInputChange(setter: (value: string) => void) {
  return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setter(e.target.value);
  };
}

function handleAsync(fn: () => Promise<void>) {
  return () => {
    fn();
  };
}

// ─── Prizes ───────────────────────────────────────────────────────────────────

function PrizesCard({ eventId }: { eventId: string }) {
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
        onClose={handleClose(setPendingDelete)}
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

function PrizeRow({
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

// ─── Shared dialog ────────────────────────────────────────────────────────────

function ConfirmDeleteDialog({
  open,
  title,
  description,
  busy,
  onConfirm,
  onClose,
}: {
  busy: boolean;
  description: string;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}) {
  return (
    <Dialog onOpenChange={handleDialogOpen(onClose)} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button disabled={busy} onClick={onConfirm} variant="destructive">
            {busy ? "Working…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettingsPending() {
  return (
    <div className="space-y-6">
      {(["a", "b"] as const).map((k) => (
        <Card key={k} variant="default">
          <CardHeader>
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-3">
            {(["a", "b", "c"] as const).map((j) => (
              <div
                className="h-9 w-full animate-pulse rounded bg-muted"
                key={j}
              />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
