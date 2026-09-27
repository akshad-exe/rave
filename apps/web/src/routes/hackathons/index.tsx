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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rave/ui/components/select";
import { Skeleton } from "@rave/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarIcon,
  ChevronDownIcon,
  ClockIcon,
  SearchIcon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react";
import { useState } from "react";
import {
  formatDate,
  formatRelativeTime,
  getEventStatusConfig,
} from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/hackathons/")({
  component: HackathonsComponent,
});

function HackathonsComponent() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data, isLoading, isError } = useQuery(
    orpc.events.list.queryOptions({
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      page,
      limit: 12,
    })
  );

  // Debounce search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    const timeout = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  };

  const events = data?.events ?? [];
  const hasMore = events.length === 12;

  if (isError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <p className="text-error">
          Failed to load hackathons. Please try again.
        </p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-bold font-display text-3xl text-foreground sm:text-4xl">
          Hackathons
        </h1>
        <p className="mt-2 text-muted-foreground">
          Discover upcoming and ongoing hackathons
        </p>
      </div>

      {/* Search & Filters */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-10"
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search hackathons..."
            value={search}
          />
        </div>
        <div className="flex gap-2">
          <Select onValueChange={setStatusFilter} value={statusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="registration">Registration Open</SelectItem>
              <SelectItem value="submission">Submissions Open</SelectItem>
              <SelectItem value="judging">Judging</SelectItem>
              <SelectItem value="results">Results</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {data
            ? `Showing ${events.length} hackathon${events.length === 1 ? "" : "s"}`
            : "Loading..."}
        </p>
      </div>

      {/* Events Grid */}
      {isLoading && !data ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="py-16 text-center">
          <TrophyIcon className="mx-auto mb-4 size-12 text-muted-foreground/50" />
          <h3 className="font-semibold text-foreground text-lg">
            No hackathons found
          </h3>
          <p className="mt-2 text-muted-foreground">
            {search || statusFilter
              ? "Try adjusting your search or filters"
              : "No hackathons available at the moment"}
          </p>
          {(search || statusFilter) && (
            <Button
              className="mt-4"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
              }}
              variant="outline"
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard event={event} key={event.id} />
            ))}
          </div>

          {hasMore && (
            <div className="mt-8 text-center">
              <Button
                className="w-full sm:w-auto"
                disabled={isLoading}
                onClick={() => setPage((p) => p + 1)}
                variant="outline"
              >
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EventCard({
  event,
}: {
  event: {
    id: string;
    name: string;
    slug: string;
    tagline: string | null;
    status: string;
    startDate: string | null;
    endDate: string | null;
    submissionDeadline: string | null;
    coverImageUrl: string | null;
    maxTeamSize: number;
  };
}) {
  const statusConfig = getEventStatusConfig(event.status);
  const isUpcoming = event.startDate && new Date(event.startDate) > new Date();

  return (
    <Link className="block" to={`/hackathons/${event.slug}`}>
      <Card className="flex h-full flex-col" variant="interactive">
        {event.coverImageUrl && (
          <div className="relative aspect-video w-full overflow-hidden rounded-t-lg">
            <img
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
              src={event.coverImageUrl}
            />
            <div className="absolute top-3 right-3">
              <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
            </div>
          </div>
        )}

        <CardHeader className="pb-2">
          <CardTitle className="line-clamp-1 text-lg">{event.name}</CardTitle>
          {event.tagline && (
            <CardDescription className="line-clamp-2">
              {event.tagline}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="flex flex-1 flex-col">
          <div className="mb-4 flex flex-wrap gap-3 text-muted-foreground text-sm">
            {event.startDate && (
              <span className="flex items-center gap-1.5">
                <CalendarIcon className="size-3.5" />
                <span>
                  {formatDate(event.startDate)} –{" "}
                  {event.endDate ? formatDate(event.endDate) : "TBD"}
                </span>
              </span>
            )}
            {event.submissionDeadline && (
              <span className="flex items-center gap-1.5">
                <ClockIcon className="size-3.5" />
                <span>
                  Submits by {formatRelativeTime(event.submissionDeadline)}
                </span>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <UsersIcon className="size-3.5" />
              <span>Teams up to {event.maxTeamSize}</span>
            </span>
          </div>

          <div className="mt-auto border-border border-t pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">View details</span>
              <ChevronDownIcon className="size-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EventCardSkeleton() {
  return (
    <Card variant="default">
      <Skeleton className="mb-4 aspect-video w-full rounded-t-lg" />
      <div className="space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </Card>
  );
}

function Link({
  to,
  children,
  className,
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a className={className} href={to}>
      {children}
    </a>
  );
}
