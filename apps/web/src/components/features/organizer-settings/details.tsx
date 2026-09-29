import { Button } from "@rave/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rave/ui/components/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@rave/ui/components/field";
import { Input } from "@rave/ui/components/input";
import { Separator } from "@rave/ui/components/separator";
import { Switch } from "@rave/ui/components/switch";
import { Textarea } from "@rave/ui/components/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useId, useState } from "react";
import { toast } from "sonner";
import { handleAsync } from "@/lib/handlers";
import { orpc } from "@/utils/orpc";
import {
  type AdminEvent,
  DATE_FIELDS,
  type DateDraft,
  type DateFieldKey,
  toDateInputValue,
  toIsoOrUndefined,
} from "./shared";

/**
 * Name, description, visibility and the schedule.
 *
 * The trap this panel exists to get right: `updateEventInput` is `.partial()`
 * over fields that carry defaults, so an omitted key resolves to its default
 * rather than being left alone. Only the date fields the organizer actually
 * filled in are sent — sending the whole draft would quietly reset visibility
 * and every team-size limit on each save.
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

export function EventDetailsPanel({
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
      setDraft((previous) => ({ ...previous, [key]: value }));
    },
    []
  );

  const handleDate = useCallback((key: DateFieldKey, value: string) => {
    setDates((previous) => ({ ...previous, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    const datesPayload: Partial<Record<DateFieldKey, string>> = {};
    for (const { key } of DATE_FIELDS) {
      const iso = toIsoOrUndefined(dates[key]);
      if (iso) {
        datesPayload[key] = iso;
      }
    }
    try {
      await updateMutation.mutateAsync({
        ...draft,
        ...datesPayload,
        eventId,
      });
      toast.success("Event updated");
      queryClient
        .invalidateQueries(
          orpc.events.getAdmin.queryOptions({ input: { eventId } })
        )
        .catch(() => undefined);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save changes"
      );
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
      <CardContent className="space-y-6">
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <LabelledField
              label="Name"
              onValue={handleText(patch, "name")}
              value={draft.name}
            />
            <LabelledField
              label="Tagline"
              onValue={handleText(patch, "tagline")}
              value={draft.tagline}
            />
            <LabelledField
              label="Slug"
              onValue={handleText(patch, "slug")}
              value={draft.slug}
            />
            <LabelledField
              label="Website URL"
              onValue={handleText(patch, "websiteUrl")}
              value={draft.websiteUrl}
            />
          </div>

          <Field>
            <FieldLabel htmlFor="event-description">Description</FieldLabel>
            <Textarea
              id="event-description"
              maxLength={10_000}
              onChange={handleTextarea(patch, "description")}
              rows={4}
              value={draft.description}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField
              hint="Teams smaller than this cannot be created"
              label="Min team size"
              onValue={handleNumber(patch, "minTeamSize")}
              value={draft.minTeamSize}
            />
            <NumberField
              label="Max team size"
              onValue={handleNumber(patch, "maxTeamSize")}
              value={draft.maxTeamSize}
            />
            <NumberField
              hint="Per voter, on the public ballot"
              label="Max votes per user"
              onValue={handleNumber(patch, "maxVotesPerUser")}
              value={draft.maxVotesPerUser}
            />
          </div>

          <div className="flex flex-wrap gap-6">
            <SwitchField
              checked={draft.isPublic}
              hint="Listed publicly and visible in the gallery"
              label="Public event"
              onChange={handleSwitch(patch, "isPublic")}
            />
            <SwitchField
              checked={draft.allowIndividuals}
              hint="Let people submit without forming a team"
              label="Allow individuals"
              onChange={handleSwitch(patch, "allowIndividuals")}
            />
          </div>
        </FieldGroup>

        <Separator />

        <FieldGroup>
          <div>
            <h3 className="font-medium text-foreground text-sm">Schedule</h3>
            <FieldDescription className="mt-1">
              Moving a deadline does not undo work already done against the old
              one. Judges and participants both see the change immediately.
            </FieldDescription>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {DATE_FIELDS.map((field) => (
              <DateFieldInput
                key={field.key}
                label={field.label}
                onChange={handleDateInput(handleDate, field.key)}
                value={dates[field.key]}
              />
            ))}
          </div>
        </FieldGroup>
      </CardContent>
      <div className="flex items-center justify-end border-border border-t p-4">
        <Button
          disabled={updateMutation.isPending}
          onClick={handleAsync(handleSave)}
        >
          {updateMutation.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </Card>
  );
}

function handleText<K extends keyof EventDraft>(
  patch: <T extends keyof EventDraft>(key: T, value: EventDraft[T]) => void,
  key: K
) {
  return (value: string) => {
    patch(key, value as EventDraft[K]);
  };
}

function handleTextarea<K extends keyof EventDraft>(
  patch: <T extends keyof EventDraft>(key: T, value: EventDraft[T]) => void,
  key: K
) {
  return (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    patch(key, e.target.value as EventDraft[K]);
  };
}

function handleNumber<K extends keyof EventDraft>(
  patch: <T extends keyof EventDraft>(key: T, value: EventDraft[T]) => void,
  key: K
) {
  return (value: number) => {
    patch(key, value as EventDraft[K]);
  };
}

function handleSwitch<K extends keyof EventDraft>(
  patch: <T extends keyof EventDraft>(key: T, value: EventDraft[T]) => void,
  key: K
) {
  return (checked: boolean) => {
    patch(key, checked as EventDraft[K]);
  };
}

function handleDateInput(
  handleDate: (key: DateFieldKey, value: string) => void,
  key: DateFieldKey
) {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    handleDate(key, e.target.value);
  };
}

/** Label + control, ids from `useId` so similar labels cannot collide. */
function LabelledField({
  label,
  value,
  onValue,
}: {
  label: string;
  onValue: (value: string) => void;
  value: string;
}) {
  const id = useId();
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} onChange={inputChange(onValue)} value={value} />
    </Field>
  );
}

function NumberField({
  label,
  value,
  onValue,
  hint,
}: {
  hint?: string;
  label: string;
  onValue: (value: number) => void;
  value: number;
}) {
  const id = useId();
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        onChange={numberChange(onValue)}
        type="number"
        value={value}
      />
      {hint ? <FieldDescription>{hint}</FieldDescription> : null}
    </Field>
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
  const id = useId();
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} onChange={onChange} type="datetime-local" value={value} />
    </Field>
  );
}

function SwitchField({
  label,
  hint,
  checked,
  onChange,
}: {
  checked: boolean;
  hint: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
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

function inputChange(onValue: (value: string) => void) {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    onValue(e.target.value);
  };
}

function numberChange(onValue: (value: number) => void) {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = Number.parseInt(e.target.value, 10);
    onValue(Number.isNaN(parsed) ? 0 : parsed);
  };
}
