import { Badge } from "@rave/ui/components/badge";
import { Button } from "@rave/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@rave/ui/components/dropdown-menu";
import {
  Empty,
  EmptyAction,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@rave/ui/components/empty";
import { Skeleton } from "@rave/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  CalendarIcon,
  EditIcon,
  MoreHorizontalIcon,
  PlusIcon,
} from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";
import {
  formatDate,
  formatRelativeTime,
  getEventStatusConfig,
} from "@/lib/utils";
import { type client, orpc } from "@/utils/orpc";

type EventListItem = Awaited<
  ReturnType<typeof client.events.list>
>["events"][number];

export const Route = createFileRoute("/(organizer)/organizer/events/")({
  component: OrganizerEventsComponent,
});

function OrganizerEventsComponent() {
  const { data: events, status: eventsStatus } = useQuery(
    orpc.events.list.queryOptions({ input: { limit: 50 } })
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold font-display text-3xl text-foreground">
            Events
          </h1>
          <p className="mt-1 text-muted-foreground">Manage your hackathons</p>
        </div>
        <Link to="/organizer/events/new">
          <Button className="gap-2">
            <PlusIcon className="size-4" />
            Create Event
          </Button>
        </Link>
      </div>

      {renderEventsBody({ events, isPending: eventsStatus === "pending" })}
    </div>
  );
}

function renderEventsBody({
  events,
  isPending,
}: {
  events: { events: EventListItem[] } | undefined;
  isPending: boolean;
}) {
  if (isPending) {
    return (
      <div className="space-y-4">
        {(["a", "b", "c", "d", "e"] as const).map((slot) => (
          <EventRowSkeleton key={slot} />
        ))}
      </div>
    );
  }

  if (events && events.events.length > 0) {
    return (
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-border border-b">
                <th className="p-4 text-left font-medium text-muted-foreground">
                  Event
                </th>
                <th className="hidden p-4 text-left font-medium text-muted-foreground md:table-cell">
                  Status
                </th>
                <th className="hidden p-4 text-left font-medium text-muted-foreground md:table-cell">
                  Dates
                </th>
                <th className="hidden p-4 text-left font-medium text-muted-foreground lg:table-cell">
                  Submissions
                </th>
                <th className="p-4 text-right font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {events.events.map((event) => (
                <EventRow event={event} key={event.id} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <CalendarIcon className="size-6" />
        </EmptyMedia>
        <EmptyTitle>No events yet</EmptyTitle>
        <EmptyDescription>
          Create your first hackathon to get started
        </EmptyDescription>
      </EmptyHeader>
      <EmptyAction>
        <Link to="/organizer/events/new">
          <Button>Create Event</Button>
        </Link>
      </EmptyAction>
    </Empty>
  );
}

// Mirrors VALID_STATUS_TRANSITIONS in apps/server/src/features/events/helpers.ts.
// The server is still the authority; this only avoids offering an action the
// server will refuse.
type EventStatus =
  | "archived"
  | "draft"
  | "judging"
  | "registration"
  | "results"
  | "submission";

const NEXT_STATUSES: Record<string, EventStatus[]> = {
  archived: [],
  draft: ["registration", "submission"],
  judging: ["results", "submission"],
  registration: ["submission", "draft"],
  results: ["archived", "judging"],
  submission: ["judging", "registration"],
};

const STATUS_ACTION_LABEL: Record<EventStatus, string> = {
  archived: "Archive",
  draft: "Move to draft",
  judging: "Open judging",
  registration: "Open registration",
  results: "Publish results",
  submission: "Open submissions",
};

// Owns its own stable callback so the menu is not handed a fresh function on
// every render.
function TransitionItem({
  disabled,
  onSelect,
  status,
}: {
  disabled: boolean;
  onSelect: (status: EventStatus) => void;
  status: EventStatus;
}) {
  const handleSelect = useCallback(() => {
    onSelect(status);
  }, [onSelect, status]);

  return (
    <DropdownMenuItem disabled={disabled} onClick={handleSelect}>
      <ArrowRightIcon className="size-4" />
      {STATUS_ACTION_LABEL[status]}
    </DropdownMenuItem>
  );
}

function EventRow({ event }: { event: EventListItem }) {
  const statusConfig = getEventStatusConfig(event.status);
  const queryClient = useQueryClient();

  // Without this the event can never leave "submission", so judging is
  // unreachable from the UI even though the API supports it.
  const transition = useMutation(
    orpc.events.transition.mutationOptions({
      onSuccess: () => {
        toast.success(`Event moved to ${statusConfig.label}`);
        queryClient.invalidateQueries({ queryKey: ["events"] });
      },
      onError: (err: unknown) => {
        toast.error(
          err instanceof Error ? err.message : "Could not change phase"
        );
      },
    })
  );

  const handleTransition = useCallback(
    (status: EventStatus) => {
      transition.mutate({ eventId: event.id, status });
    },
    [event.id, transition]
  );

  const nextStatuses = NEXT_STATUSES[event.status] ?? [];

  return (
    <tr className="border-border/50 border-b hover:bg-muted/30">
      <td className="p-4">
        <Link
          className="font-medium text-foreground hover:text-primary"
          to="/organizer/events"
        >
          {event.name}
        </Link>
      </td>
      <td className="hidden p-4 md:table-cell">
        <Badge className="text-xs" variant={statusConfig.variant}>
          {statusConfig.label}
        </Badge>
      </td>
      <td className="hidden p-4 text-muted-foreground text-sm md:table-cell">
        {event.startDate ? formatDate(event.startDate) : "TBD"}
        {event.endDate ? ` – ${formatDate(event.endDate)}` : null}
      </td>
      <td className="hidden p-4 text-muted-foreground text-sm lg:table-cell">
        {event.submissionDeadline
          ? `Until ${formatRelativeTime(event.submissionDeadline)}`
          : "N/A"}
      </td>
      <td className="p-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-8 w-8" size="icon" variant="ghost">
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {nextStatuses.map((status) => (
              <TransitionItem
                disabled={transition.isPending}
                key={status}
                onSelect={handleTransition}
                status={status}
              />
            ))}
            {nextStatuses.length > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem asChild>
              <Link
                params={{ eventId: event.id }}
                to="/organizer/events/$eventId/rubric"
              >
                <EditIcon className="size-4" />
                Manage rubric
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

function EventRowSkeleton() {
  return (
    <tr>
      <td className="p-4">
        <Skeleton className="h-5 w-3/4" />
      </td>
      <td className="hidden p-4 md:table-cell">
        <Skeleton className="h-5 w-20" />
      </td>
      <td className="hidden p-4 md:table-cell">
        <Skeleton className="h-4 w-24" />
      </td>
      <td className="hidden p-4 lg:table-cell">
        <Skeleton className="h-4 w-24" />
      </td>
      <td className="p-4">
        <Skeleton className="h-8 w-8" />
      </td>
    </tr>
  );
}
