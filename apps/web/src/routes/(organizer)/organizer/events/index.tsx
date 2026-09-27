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
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChartIcon,
  CalendarIcon,
  CodeIcon,
  EditIcon,
  MoreHorizontalIcon,
  PlusIcon,
  TrashIcon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react";
import {
  formatDate,
  formatRelativeTime,
  getEventStatusConfig,
} from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/(organizer)/organizer/events/")({
  component: OrganizerEventsComponent,
});

function OrganizerEventsComponent() {
  const { data: myEvents, isLoading } = useQuery(
    orpc.events.list.queryOptions({ limit: 50 })
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

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <EventRowSkeleton key={i} />
          ))}
        </div>
      ) : myEvents && myEvents.events.length > 0 ? (
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
                {myEvents.events.map((event) => (
                  <EventRow event={event} key={event.id} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
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
      )}
    </div>
  );
}

function EventRow({
  event,
}: {
  event: {
    id: string;
    name: string;
    slug: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    submissionDeadline: string | null;
  };
}) {
  const statusConfig = getEventStatusConfig(event.status);

  return (
    <tr className="border-border/50 border-b hover:bg-muted/30">
      <td className="p-4">
        <Link
          className="font-medium text-foreground hover:text-primary"
          to={`/organizer/events/${event.slug}`}
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
        {event.endDate && ` – ${formatDate(event.endDate)}`}
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
            <DropdownMenuItem asChild>
              <Link to={`/organizer/events/${event.slug}`}>
                <EditIcon className="size-4" />
                Edit Event
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`/organizer/events/${event.slug}/participants`}>
                <UsersIcon className="size-4" />
                Participants
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`/organizer/events/${event.slug}/submissions`}>
                <CodeIcon className="size-4" />
                Submissions
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`/organizer/events/${event.slug}/judging`}>
                <TrophyIcon className="size-4" />
                Judging
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`/organizer/events/${event.slug}/analytics`}>
                <BarChartIcon className="size-4" />
                Analytics
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="text-error">
              <Link to={`/organizer/events/${event.slug}/settings`}>
                <TrashIcon className="size-4" />
                Delete Event
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
