import { Badge } from "@rave/ui/components/badge";
import { Button } from "@rave/ui/components/button";
import { Card } from "@rave/ui/components/card";
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
  AlertCircleIcon,
  CalendarIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  CodeIcon,
  PlusIcon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react";
import {
  formatDate,
  formatRelativeTime,
  getEventStatusConfig,
} from "@/lib/utils";
import { orpc } from "@/utils/orpc";

/** Stable keys for skeleton placeholders, which have no id of their own. */
const EVENT_SKELETON_KEYS = ["a", "b", "c"] as const;
const SUBMISSION_SKELETON_KEYS = ["a", "b", "c"] as const;

export const Route = createFileRoute("/(dashboard)/dashboard")({
  component: DashboardComponent,
});

function DashboardComponent() {
  const { data: myEvents, status: eventsStatus } = useQuery(
    orpc.events.list.queryOptions({ limit: 5 })
  );
  const { data: mySubmissions, status: submissionsStatus } = useQuery(
    orpc.submissions.mySubmissions.queryOptions()
  );
  const { data: myTeam } = useQuery(
    orpc.teams.myTeam.queryOptions({ eventId: "" })
  );

  const upcomingEvents =
    myEvents?.events
      ?.filter((e) => new Date(e.startDate) > new Date())
      .slice(0, 3) ?? [];
  const recentSubmissions = mySubmissions?.slice(0, 3) ?? [];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold font-display text-3xl text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Welcome back! Here's what's happening with your hackathons.
          </p>
        </div>
        <Link to="/hackathons">
          <Button className="gap-2">
            <PlusIcon className="size-4" />
            Browse Events
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CalendarIcon}
          title="Registered Events"
          trend="+2 this month"
          value={myEvents?.events?.length ?? 0}
        />
        <StatCard
          icon={UsersIcon}
          title="Active Teams"
          trend={myTeam ? "1 active" : "No team yet"}
          value={myTeam ? 1 : 0}
        />
        <StatCard
          icon={CodeIcon}
          title="Submissions"
          trend={
            recentSubmissions.filter((s) => s.status === "submitted").length
          }
          value={mySubmissions?.length ?? 0}
        />
        <StatCard
          icon={TrophyIcon}
          title="Awards Won"
          trend="Check results"
          value={
            mySubmissions?.filter(
              (s) => s.status === "submitted" && s.submittedAt
            ).length ?? 0
          }
        />
      </div>

      {/* Upcoming Events */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display font-semibold text-foreground text-xl">
            Upcoming Events
          </h2>
          <Link to="/dashboard/events">
            <Button size="sm" variant="ghost">
              View all
            </Button>
          </Link>
        </div>
        {renderUpcomingEvents(eventsStatus, upcomingEvents)}
      </section>

      {/* Recent Submissions */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display font-semibold text-foreground text-xl">
            Recent Submissions
          </h2>
          <Link to="/dashboard/submissions">
            <Button size="sm" variant="ghost">
              View all
            </Button>
          </Link>
        </div>
        {renderRecentSubmissions(submissionsStatus, recentSubmissions)}
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="mb-4 font-display font-semibold text-foreground text-xl">
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ActionCard
            description="Register for a new hackathon"
            href="/hackathons"
            icon={PlusIcon}
            title="Join Event"
          />
          <ActionCard
            description="Form a team for an event"
            href="/dashboard/teams/new"
            icon={UsersIcon}
            title="Create Team"
          />
          <ActionCard
            description="Start a project submission"
            href="/submit"
            icon={CodeIcon}
            title="New Submission"
          />
          <ActionCard
            description="See submitted projects"
            href="/gallery"
            icon={TrophyIcon}
            title="View Gallery"
          />
        </div>
      </section>
    </div>
  );
}

function renderUpcomingEvents(
  eventsStatus: string,
  upcomingEvents: {
    id: string;
    name: string;
    slug: string;
    status: string;
    startDate: string | null;
    submissionDeadline: string | null;
    coverImageUrl: string | null;
  }[]
) {
  if (eventsStatus === "pending") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EVENT_SKELETON_KEYS.map((key) => (
          <EventCardSkeleton key={key} />
        ))}
      </div>
    );
  }

  if (upcomingEvents.length > 0) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {upcomingEvents.map((event) => (
          <EventCard event={event} key={event.id} />
        ))}
      </div>
    );
  }

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <CalendarIcon className="size-6" />
        </EmptyMedia>
        <EmptyTitle>No upcoming events</EmptyTitle>
        <EmptyDescription>
          Discover hackathons and register to get started
        </EmptyDescription>
      </EmptyHeader>
      <EmptyAction>
        <Link to="/hackathons">
          <Button>Explore Hackathons</Button>
        </Link>
      </EmptyAction>
    </Empty>
  );
}

function renderRecentSubmissions(
  submissionsStatus: string,
  recentSubmissions: {
    id: string;
    name: string;
    status: string;
    submittedAt: string | null;
    trackId: string | null;
  }[]
) {
  if (submissionsStatus === "pending") {
    return (
      <div className="space-y-3">
        {SUBMISSION_SKELETON_KEYS.map((key) => (
          <SubmissionRowSkeleton key={key} />
        ))}
      </div>
    );
  }

  if (recentSubmissions.length > 0) {
    return (
      <div className="space-y-3">
        {recentSubmissions.map((submission) => (
          <SubmissionRow key={submission.id} submission={submission} />
        ))}
      </div>
    );
  }

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <CodeIcon className="size-6" />
        </EmptyMedia>
        <EmptyTitle>No submissions yet</EmptyTitle>
        <EmptyDescription>
          Start building and submit your first project
        </EmptyDescription>
      </EmptyHeader>
      <EmptyAction>
        <Link to="/submit">
          <Button>Create Submission</Button>
        </Link>
      </EmptyAction>
    </Empty>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
}: {
  title: string;
  value: number;
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
  const coverImageUrl = event.coverImageUrl ?? "";
  const hasCoverImage = Boolean(event.coverImageUrl);
  const hasStartDate = Boolean(event.startDate);
  const hasSubmissionDeadline = Boolean(event.submissionDeadline);
  const startDate = event.startDate ?? "";
  const submissionDeadline = event.submissionDeadline ?? "";

  return (
    <Link className="block" to={`/hackathons/${event.slug}`}>
      <Card className="h-full" variant="interactive">
        {hasCoverImage && (
          <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-t-lg">
            <img
              alt=""
              className="h-full w-full object-cover"
              height="200"
              src={coverImageUrl}
              width="400"
            />
            <div className="absolute top-2 right-2">
              <Badge className="text-xs" variant={statusConfig.variant}>
                {statusConfig.label}
              </Badge>
            </div>
          </div>
        )}
        <div className="space-y-2">
          <h3 className="line-clamp-1 font-semibold text-foreground">
            {event.name}
          </h3>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            {hasStartDate && (
              <span className="flex items-center gap-1.5">
                <CalendarIcon className="size-3.5" />
                <span>{formatDate(startDate)}</span>
              </span>
            )}
            {hasSubmissionDeadline && (
              <span className="flex items-center gap-1.5">
                <ClockIcon className="size-3.5" />
                <span>Submits {formatRelativeTime(submissionDeadline)}</span>
              </span>
            )}
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

function SubmissionRow({
  submission,
}: {
  submission: {
    id: string;
    name: string;
    status: string;
    submittedAt: string | null;
    trackId: string | null;
  };
}) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "draft":
        return {
          label: "Draft",
          variant: "outline" as const,
          icon: AlertCircleIcon,
        };
      case "submitted":
        return {
          label: "Submitted",
          variant: "success" as const,
          icon: CheckCircleIcon,
        };
      default:
        return {
          label: status,
          variant: "default" as const,
          icon: AlertCircleIcon,
        };
    }
  };
  const config = getStatusConfig(submission.status);
  const Icon = config.icon;
  const hasSubmittedAt = Boolean(submission.submittedAt);
  const submittedAt = submission.submittedAt ?? "";

  return (
    <Card
      className="flex items-center justify-between p-4"
      variant="borderless"
    >
      <div className="flex items-center gap-4">
        <div className="rounded-lg bg-muted p-2">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-foreground">{submission.name}</p>
          <p className="text-muted-foreground text-sm">
            {submission.trackId ? `Track: ${submission.trackId}` : "No track"}
            {hasSubmittedAt &&
              ` • Submitted ${formatRelativeTime(submittedAt)}`}
          </p>
        </div>
      </div>
      <Badge variant={config.variant}>{config.label}</Badge>
    </Card>
  );
}

function SubmissionRowSkeleton() {
  return (
    <Card className="p-4" variant="borderless">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
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
