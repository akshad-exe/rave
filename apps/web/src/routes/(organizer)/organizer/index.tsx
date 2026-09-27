import { Badge } from "@rave/ui/components/badge";
import { Button } from "@rave/ui/components/button";
import { Card } from "@rave/ui/components/card";
import { Skeleton } from "@rave/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChartIcon,
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
  CodeIcon,
  PlusIcon,
  ShieldIcon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react";
import {
  formatDate,
  formatRelativeTime,
  getEventStatusConfig,
} from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/(organizer)/organizer/")({
  component: OrganizerDashboardComponent,
});

function OrganizerDashboardComponent() {
  const { data: myEvents, status: eventsStatus } = useQuery(
    orpc.events.list.queryOptions({ limit: 10 })
  );

  const totalEvents = myEvents?.events?.length ?? 0;
  const activeEvents =
    myEvents?.events?.filter((e) =>
      ["registration", "submission", "judging"].includes(e.status)
    ).length ?? 0;
  const totalSubmissions = 0; // Would come from analytics
  const totalParticipants = 0; // Would come from analytics

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold font-display text-3xl text-foreground">
            Organizer Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your hackathons and view analytics
          </p>
        </div>
        <Link to="/organizer/events/new">
          <Button className="gap-2">
            <PlusIcon className="size-4" />
            Create Event
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CalendarIcon}
          title="Total Events"
          trend={`${activeEvents} active`}
          value={totalEvents}
        />
        <StatCard
          icon={UsersIcon}
          title="Participants"
          trend="Across all events"
          value={totalParticipants}
        />
        <StatCard
          icon={CodeIcon}
          title="Submissions"
          trend="Pending review"
          value={totalSubmissions}
        />
        <StatCard
          icon={TrophyIcon}
          title="Awards"
          trend="Results pending"
          value="—"
        />
      </div>

      {/* Quick Actions */}
      <section>
        <h2 className="mb-4 font-display font-semibold text-foreground text-xl">
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ActionCard
            description="Set up a new hackathon"
            href="/organizer/events/new"
            icon={PlusIcon}
            title="Create Event"
          />
          <ActionCard
            description="View and manage registrations"
            href="/organizer/participants"
            icon={UsersIcon}
            title="Manage Participants"
          />
          <ActionCard
            description="Set up rubrics and assign judges"
            href="/organizer/judging"
            icon={ShieldIcon}
            title="Configure Judging"
          />
          <ActionCard
            description="Track event performance"
            href="/organizer/analytics"
            icon={BarChartIcon}
            title="View Analytics"
          />
        </div>
      </section>

      {/* Recent Events */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display font-semibold text-foreground text-xl">
            Your Events
          </h2>
          <Link to="/organizer/events">
            <Button size="sm" variant="ghost">
              View all
            </Button>
          </Link>
        </div>
        {renderOrganizerEvents({
          events: myEvents,
          isPending: eventsStatus === "pending",
        })}
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  trend: string;
}) {
  return (
    <Card className="p-5" variant="default">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-sm">{title}</p>
          <p className="mt-1 font-bold font-display text-3xl text-foreground">
            {value}
          </p>
        </div>
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="size-6" />
        </div>
      </div>
      <p className="mt-3 text-muted-foreground text-xs">{trend}</p>
    </Card>
  );
}

function renderOrganizerEvents({
  events,
  isPending,
}: {
  events: { events: unknown[] } | undefined;
  isPending: boolean;
}) {
  if (isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(["a", "b", "c"] as const).map((slot) => (
          <EventCardSkeleton key={slot} />
        ))}
      </div>
    );
  }

  if (events && events.events.length > 0) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.events.map((event) => (
          <EventCard event={event} key={event.id} />
        ))}
      </div>
    );
  }

  return (
    <Card className="p-8 text-center" variant="default">
      <CalendarIcon className="mx-auto mb-4 size-12 text-muted-foreground/50" />
      <h3 className="font-semibold text-foreground text-lg">No events yet</h3>
      <p className="mt-2 text-muted-foreground">
        Create your first hackathon to get started
      </p>
      <Link className="mt-4 inline-block" to="/organizer/events/new">
        <Button>Create Event</Button>
      </Link>
    </Card>
  );
}

function EventCard({
  event,
}: {
  event: {
    id: string;
    name: string;
    slug: string;
    status: string;
    startDate: string | null;
    submissionDeadline: string | null;
    coverImageUrl: string | null;
  };
}) {
  const statusConfig = getEventStatusConfig(event.status);

  return (
    <Link className="block" to={`/organizer/events/${event.slug}`}>
      <Card className="h-full" variant="interactive">
        {event.coverImageUrl ? (
          <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-t-lg">
            <img
              alt=""
              className="h-full w-full object-cover"
              height={360}
              src={event.coverImageUrl}
              width={640}
            />
            <div className="absolute top-2 right-2">
              <Badge className="text-xs" variant={statusConfig.variant}>
                {statusConfig.label}
              </Badge>
            </div>
          </div>
        ) : null}
        <div className="space-y-2">
          <h3 className="line-clamp-1 font-semibold text-foreground">
            {event.name}
          </h3>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            {event.startDate ? (
              <>
                <CalendarIcon className="size-3.5" />
                <span>{formatDate(event.startDate)}</span>
              </>
            ) : null}
            {event.submissionDeadline ? (
              <>
                <ClockIcon className="size-3.5" />
                <span>
                  Submits {formatRelativeTime(event.submissionDeadline)}
                </span>
              </>
            ) : null}
          </div>
        </div>
      </Card>
    </Link>
  );
}

function EventCardSkeleton() {
  return (
    <Card variant="default">
      <Skeleton className="mb-4 aspect-video w-full rounded-t-lg" />
      <div className="space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </Card>
  );
}

function ActionCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link to={href}>
      <Card className="flex flex-col justify-between p-5" variant="interactive">
        <div>
          <div className="mb-3 rounded-lg bg-primary/10 p-2 text-primary">
            <Icon className="size-5" />
          </div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-muted-foreground text-sm">{description}</p>
        </div>
        <ChevronRightIcon className="size-5 self-end text-muted-foreground" />
      </Card>
    </Link>
  );
}
