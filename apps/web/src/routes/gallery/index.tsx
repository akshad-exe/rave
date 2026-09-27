import { Badge } from "@rave/ui/components/badge";
import { Button } from "@rave/ui/components/button";
import { Card, CardContent } from "@rave/ui/components/card";
import {
  Empty,
  EmptyAction,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@rave/ui/components/empty";
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
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarIcon,
  CodeIcon,
  SearchIcon,
  TagIcon,
  TrophyIcon,
} from "lucide-react";
import { useState } from "react";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/gallery/")({
  component: GalleryComponent,
});

function GalleryComponent() {
  const [search, setSearch] = useState("");
  const [trackFilter, setTrackFilter] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "name">("recent");
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data, isLoading, isError } = useQuery(
    orpc.submissions.gallery.queryOptions({
      eventId: "", // Will use default public event
      search: debouncedSearch || undefined,
      trackId: trackFilter || undefined,
      sortBy,
      page,
      limit: 12,
    })
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    const timeout = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  };

  const submissions = data?.submissions ?? [];
  const hasMore = submissions.length === 12;

  if (isError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <p className="text-error">Failed to load gallery. Please try again.</p>
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
          Project Gallery
        </h1>
        <p className="mt-2 text-muted-foreground">
          Explore projects submitted to hackathons
        </p>
      </div>

      {/* Search & Filters */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-10"
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search projects..."
            value={search}
          />
        </div>
        <div className="flex gap-2">
          <Select onValueChange={setTrackFilter} value={trackFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Tracks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Tracks</SelectItem>
              {/* Tracks would be populated from API */}
            </SelectContent>
          </Select>
          <Select onValueChange={setSortBy} value={sortBy}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {data
            ? `Showing ${submissions.length} project${submissions.length === 1 ? "" : "s"}`
            : "Loading..."}
        </p>
      </div>

      {/* Gallery Grid */}
      {isLoading && !data ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <TrophyIcon className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No projects found</EmptyTitle>
            <EmptyDescription>
              {search || trackFilter
                ? "Try adjusting your search or filters"
                : "No projects have been submitted yet"}
            </EmptyDescription>
          </EmptyHeader>
          {(search || trackFilter) && (
            <EmptyAction>
              <Button
                onClick={() => {
                  setSearch("");
                  setTrackFilter("");
                }}
                variant="outline"
              >
                Clear filters
              </Button>
            </EmptyAction>
          )}
        </Empty>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {submissions.map((project) => (
              <ProjectCard key={project.id} project={project} />
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

function ProjectCard({
  project,
}: {
  project: {
    id: string;
    name: string;
    tagline: string | null;
    teamId: string | null;
    trackId: string | null;
    submittedAt: string | null;
    repositoryUrl: string | null;
    thumbnailUrl: string | null;
  };
}) {
  return (
    <Link className="block" to={`/submissions/${project.id}`}>
      <Card className="flex h-full flex-col" variant="interactive">
        <div className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-muted">
          {project.thumbnailUrl ? (
            <img
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
              src={project.thumbnailUrl}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground/50">
              <CodeIcon className="size-12" />
            </div>
          )}
          {project.submittedAt && (
            <div className="absolute bottom-2 left-2">
              <Badge className="text-xs" variant="subtle">
                Submitted {formatRelativeTime(project.submittedAt)}
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="flex flex-1 flex-col p-4">
          <h3 className="line-clamp-1 font-semibold text-foreground">
            {project.name}
          </h3>
          {project.tagline && (
            <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
              {project.tagline}
            </p>
          )}

          <div className="mt-auto flex flex-wrap gap-2 pt-3 text-muted-foreground text-xs">
            {project.trackId && (
              <span className="flex items-center gap-1 rounded bg-muted px-2 py-0.5">
                <TagIcon className="size-3" />
                {project.trackId}
              </span>
            )}
            <span className="flex items-center gap-1">
              <CalendarIcon className="size-3" />
              {project.submittedAt
                ? formatDate(project.submittedAt)
                : "Pending"}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-1.5">
              {project.repositoryUrl && (
                <a
                  className="text-muted-foreground transition-colors hover:text-primary"
                  href={project.repositoryUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <CodeIcon className="size-4" />
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ProjectCardSkeleton() {
  return (
    <Card variant="default">
      <Skeleton className="mb-4 aspect-video w-full rounded-t-lg" />
      <div className="space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
    </Card>
  );
}
