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
import type * as React from "react";
import { useCallback, useEffect, useState } from "react";

const PAGE_SIZE = 12;
const SKELETON_SLOTS = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

import { formatDate, formatRelativeTime } from "@/lib/utils";
import { type client, orpc } from "@/utils/orpc";

type GalleryItem = Awaited<
  ReturnType<typeof client.submissions.gallery>
>["submissions"][number];

export const Route = createFileRoute("/gallery/")({
  component: GalleryComponent,
});

function GalleryComponent() {
  const [search, setSearch] = useState("");
  const [trackFilter, setTrackFilter] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "name">("recent");
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data, status, isError } = useQuery(
    orpc.submissions.gallery.queryOptions({
      eventId: "", // Will use default public event
      search: debouncedSearch || undefined,
      trackId: trackFilter || undefined,
      sortBy,
      page,
      limit: PAGE_SIZE,
    })
  );

  // The previous version returned a cleanup function from the change handler,
  // where React discards it, so no timeout was ever cleared. Debounce properly.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(event.target.value);
    },
    []
  );

  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setTrackFilter("");
  }, []);

  const handleLoadMore = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  const submissions = data?.submissions ?? [];
  const hasMore = submissions.length === PAGE_SIZE;
  const hasFilters = Boolean(search || trackFilter);

  if (isError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <p className="text-error">Failed to load gallery. Please try again.</p>
        <Button className="mt-4" onClick={handleRetry} type="button">
          Retry
        </Button>
      </div>
    );
  }

  const body = renderGalleryBody({
    hasFilters,
    hasMore,
    isPending: status === "pending" && !data,
    onClearFilters: handleClearFilters,
    onLoadMore: handleLoadMore,
    submissions,
  });

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
            onChange={handleSearchChange}
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
      {body}
    </div>
  );
}

function renderGalleryBody({
  submissions,
  hasMore,
  hasFilters,
  isPending,
  onClearFilters,
  onLoadMore,
}: {
  hasFilters: boolean;
  hasMore: boolean;
  isPending: boolean;
  onClearFilters: () => void;
  onLoadMore: () => void;
  submissions: GalleryItem[];
}) {
  if (isPending) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {SKELETON_SLOTS.map((slot) => (
          <ProjectCardSkeleton key={slot} />
        ))}
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia>
            <TrophyIcon className="size-6" />
          </EmptyMedia>
          <EmptyTitle>No projects found</EmptyTitle>
          <EmptyDescription>
            {hasFilters
              ? "Try adjusting your search or filters"
              : "No projects have been submitted yet"}
          </EmptyDescription>
        </EmptyHeader>
        {hasFilters ? (
          <EmptyAction>
            <Button onClick={onClearFilters} type="button" variant="outline">
              Clear filters
            </Button>
          </EmptyAction>
        ) : null}
      </Empty>
    );
  }

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {submissions.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
      {hasMore ? (
        <div className="mt-8 text-center">
          <Button
            className="w-full sm:w-auto"
            onClick={onLoadMore}
            type="button"
            variant="outline"
          >
            Load more
          </Button>
        </div>
      ) : null}
    </>
  );
}

function ProjectCard({ project }: { project: GalleryItem }) {
  return (
    <Link className="block" to={`/submissions/${project.id}`}>
      <Card className="flex h-full flex-col" variant="interactive">
        <div className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-muted">
          {project.thumbnailUrl ? (
            <img
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
              height={360}
              src={project.thumbnailUrl}
              width={640}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground/50">
              <CodeIcon className="size-12" />
            </div>
          )}
          {project.submittedAt ? (
            <div className="absolute bottom-2 left-2">
              <Badge className="text-xs" variant="subtle">
                Submitted {formatRelativeTime(project.submittedAt)}
              </Badge>
            </div>
          ) : null}
        </div>

        <CardContent className="flex flex-1 flex-col p-4">
          <h3 className="line-clamp-1 font-semibold text-foreground">
            {project.name}
          </h3>
          {project.tagline ? (
            <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
              {project.tagline}
            </p>
          ) : null}

          <div className="mt-auto flex flex-wrap gap-2 pt-3 text-muted-foreground text-xs">
            {project.trackId ? (
              <span className="flex items-center gap-1 rounded bg-muted px-2 py-0.5">
                <TagIcon className="size-3" />
                {project.trackId}
              </span>
            ) : null}
            <span className="flex items-center gap-1">
              <CalendarIcon className="size-3" />
              {project.submittedAt
                ? formatDate(project.submittedAt)
                : "Pending"}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-1.5">
              {project.repositoryUrl ? (
                <a
                  className="text-muted-foreground transition-colors hover:text-primary"
                  href={project.repositoryUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <CodeIcon className="size-4" />
                </a>
              ) : null}
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
