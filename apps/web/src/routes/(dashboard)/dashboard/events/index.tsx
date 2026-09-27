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
import { CalendarIcon, CodeIcon } from "lucide-react";
import {
  formatDate,
  formatRelativeTime,
  getEventStatusConfig,
} from "@/lib/utils";
import { type client, orpc } from "@/utils/orpc";

type EventListItem = Awaited<
  ReturnType<typeof client.events.list>
>["events"][number];

export const Route = createFileRoute("/(dashboard)/dashboard/events/")({
  component: EventsComponent,
});

function EventsComponent() {
  const { data: myEvents, status } = useQuery(
    orpc.events.list.queryOptions({ input: { limit: 20 } })
  );

  const skeletonKeys = Array.from({ length: 6 }, (_, i) => `skeleton-${i}`);

  if (status === "pending" && !myEvents) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-bold font-display text-3xl text-foreground">
            My Events
          </h1>
          <p className="mt-1 text-muted-foreground">
            Hackathons you've registered for
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skeletonKeys.map((key) => (
            <EventCardSkeleton key={key} />
          ))}
        </div>
      </div>
    );
  }

  if (!myEvents || myEvents.events.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-bold font-display text-3xl text-foreground">
            My Events
          </h1>
          <p className="mt-1 text-muted-foreground">
            Hackathons you've registered for
          </p>
        </div>
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <CalendarIcon className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No registered events</EmptyTitle>
            <EmptyDescription>
              Browse hackathons and register to participate
            </EmptyDescription>
          </EmptyHeader>
          <EmptyAction>
            <Link to="/hackathons">
              <Button>Explore Hackathons</Button>
            </Link>
          </EmptyAction>
        </Empty>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold font-display text-3xl text-foreground">
          My Events
        </h1>
        <p className="mt-1 text-muted-foreground">
          Hackathons you've registered for
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {myEvents.events.map((event) => (
          <EventCard event={event} key={event.id} />
        ))}
      </div>
    </div>
  );
}

function EventCard({ event }: { event: EventListItem }) {
  const statusConfig = getEventStatusConfig(event.status);
  const coverImageUrl = event.coverImageUrl ?? "";
  const startDate = event.startDate ?? "";
  const submissionDeadline = event.submissionDeadline ?? "";
  const hasCoverImage = Boolean(event.coverImageUrl);
  const hasTagline = Boolean(event.tagline);
  const hasStartDate = Boolean(event.startDate);
  const hasSubmissionDeadline = Boolean(event.submissionDeadline);

  return (
    <Link
      className="block"
      params={{ slug: event.slug }}
      search={{ tab: "overview" }}
      to="/hackathons/$slug"
    >
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
          {hasTagline && (
            <p className="line-clamp-2 text-muted-foreground text-sm">
              {event.tagline}
            </p>
          )}
          <div className="flex flex-wrap gap-2 text-muted-foreground text-sm">
            {hasStartDate && (
              <span className="flex items-center gap-1.5">
                <CalendarIcon className="size-3.5" />
                <span>{formatDate(startDate)}</span>
              </span>
            )}
            {hasSubmissionDeadline && (
              <span className="flex items-center gap-1.5">
                <CodeIcon className="size-3.5" />
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
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </Card>
  );
}
