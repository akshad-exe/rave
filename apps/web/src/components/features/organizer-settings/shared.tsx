import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@rave/ui/components/alert-dialog";
import { handleDialogClose } from "@/lib/handlers";
import type { client } from "@/utils/orpc";

/**
 * Types, date coercion, and the two pieces every settings panel shares.
 *
 * The date helpers are here because the trap is easy to get wrong twice:
 * `updateEventInput` is `.partial()` over fields that carry defaults, so an
 * omitted key resolves to its default rather than being left alone, and
 * `datetime-local` yields a local `YYYY-MM-DDTHH:mm` that the schema rejects
 * because it wants a complete timestamp.
 */

export type Track = Awaited<ReturnType<typeof client.tracks.list>>[number];
export type Prize = Awaited<ReturnType<typeof client.prizes.list>>[number];
export type AdminEvent = Awaited<
  ReturnType<typeof client.events.getAdmin>
>["event"];

export type DateFieldKey =
  | "endDate"
  | "judgingEndAt"
  | "judgingStartAt"
  | "registrationEndAt"
  | "registrationStartAt";

export type DateDraft = Record<DateFieldKey, string>;

export const DATE_FIELDS: Array<{ key: DateFieldKey; label: string }> = [
  { key: "registrationStartAt", label: "Registration opens" },
  { key: "registrationEndAt", label: "Registration closes" },
  { key: "judgingStartAt", label: "Judging opens" },
  { key: "judgingEndAt", label: "Judging closes" },
  { key: "endDate", label: "Event ends" },
];

/** ISO timestamp to the local string a `datetime-local` control can render. */
export function toDateInputValue(
  value: Date | string | null | undefined
): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Local control string back to the full ISO timestamp the schema requires. */
export function toIsoOrUndefined(value: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export interface DeleteDialogProps {
  busy: boolean;
  description: string;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}

export function ConfirmDeleteDialog({
  open,
  title,
  description,
  busy,
  onConfirm,
  onClose,
}: DeleteDialogProps) {
  return (
    <AlertDialog onOpenChange={handleDialogClose(onClose)} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} variant="destructive">
            {busy ? "Working…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
