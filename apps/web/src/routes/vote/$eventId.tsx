import { Badge } from "@rave/ui/components/badge";
import { Button } from "@rave/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@rave/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@rave/ui/components/empty";
import { Skeleton } from "@rave/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  ArrowUpDownIcon,
  HeartIcon,
  HeartOffIcon,
  Loader2Icon,
  MessageSquareIcon,
  UsersIcon,
} from "lucide-react";
import { type ChangeEvent, useCallback, useMemo, useState } from "react";

import { formatRelativeTime } from "@/lib/utils";
import { type client, orpc } from "@/utils/orpc";

const PAGE_SIZE = 20;

// Precomputed so the loading placeholders get stable keys that are not derived
// from an array index.
const SKELETON_KEYS = Array.from(
  { length: 5 },
  (_, i) => `ballot-skeleton-${i}`
);

type BallotItem = Awaited<
  ReturnType<typeof client.submissions.gallery>
>["submissions"][number] & {
  voteCount: number;
  userVoted: boolean;
  influence: number;
};

type SortBy = "influence" | "votes" | "name";

export const Route = createFileRoute("/vote/$eventId")({
  component: VoteComponent,
});

function VoteComponent() {
  const { eventId } = useParams({ from: "/vote/$eventId", strict: true });
  const [sortBy, setSortBy] = useState<SortBy>("influence");
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  // Fetch submissions for the event (ballot)
  const {
    data: galleryData,
    status: galleryStatus,
    isError: galleryError,
  } = useQuery(
    orpc.submissions.gallery.queryOptions({
      input: {
        eventId,
        sortBy: sortBy === "name" ? "name" : "recent",
        page,
        limit: PAGE_SIZE,
      },
    })
  );

  // Fetch vote counts for the event
  const { data: countsData, isLoading: countsLoading } = useQuery({
    ...orpc.voting.counts.queryOptions({ input: { eventId } }),
    enabled: !!eventId,
  });

  // Fetch user's votes for the event
  const { data: myVotesData } = useQuery({
    ...orpc.voting.myVotes.queryOptions({ input: { eventId } }),
    enabled: !!eventId,
  });

  // Build vote count map
  const voteCountMap = useMemo(() => {
    const map = new Map<string, number>();
    if (countsData) {
      for (const c of countsData) {
        map.set(c.submissionId, c.votes);
      }
    }
    return map;
  }, [countsData]);

  // Build user vote set
  const userVoteSet = useMemo(() => {
    const set = new Set<string>();
    if (myVotesData) {
      for (const v of myVotesData) {
        set.add(v.submissionId);
      }
    }
    return set;
  }, [myVotesData]);

  // Build ballot items with vote state
  const ballotItems = useMemo((): BallotItem[] => {
    if (!galleryData?.submissions) {
      return [];
    }

    const items = galleryData.submissions.map((sub) => {
      const votes = voteCountMap.get(sub.id) ?? 0;
      const userVoted = userVoteSet.has(sub.id);
      // Quadratic influence: sqrt(votes)
      const influence = Math.sqrt(votes);

      return {
        ...sub,
        voteCount: votes,
        userVoted,
        influence,
      };
    });

    // Sort based on sortBy
    switch (sortBy) {
      case "influence":
        return items.sort((a, b) => b.influence - a.influence);
      case "votes":
        return items.sort((a, b) => b.voteCount - a.voteCount);
      case "name":
        return items.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return items;
    }
  }, [galleryData, voteCountMap, userVoteSet, sortBy]);

  const hasMore = (galleryData?.submissions.length ?? 0) === PAGE_SIZE;
  const isPending = galleryStatus === "pending" && !galleryData;

  // Vote mutation
  const voteMutation = useMutation(
    orpc.voting.vote.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["voting", "counts", eventId],
        });
        queryClient.invalidateQueries({
          queryKey: ["voting", "myVotes", eventId],
        });
      },
      onError: (error) => {
        console.error("Vote failed:", error);
      },
    })
  );

  // Unvote mutation
  const unvoteMutation = useMutation(
    orpc.voting.unvote.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["voting", "counts", eventId],
        });
        queryClient.invalidateQueries({
          queryKey: ["voting", "myVotes", eventId],
        });
      },
      onError: (error) => {
        console.error("Unvote failed:", error);
      },
    })
  );

  const handleVote = useCallback(
    (submissionId: string) => {
      voteMutation.mutate({ eventId, submissionId });
    },
    [voteMutation, eventId]
  );

  const handleUnvote = useCallback(
    (submissionId: string) => {
      unvoteMutation.mutate({ eventId, submissionId });
    },
    [unvoteMutation, eventId]
  );

  const handleLoadMore = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  const handleSortChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as SortBy);
  }, []);

  if (galleryError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <p className="text-error">Failed to load ballot. Please try again.</p>
        <Button className="mt-4" onClick={handleReload} type="button">
          Retry
        </Button>
      </div>
    );
  }

  // Resolved with early returns rather than a nested ternary, so each ballot
  // state reads as its own branch.
  const ballotContent = (() => {
    if (isPending) {
      return SKELETON_KEYS.map((key) => <BallotItemSkeleton key={key} />);
    }
    if (ballotItems.length === 0) {
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <UsersIcon className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No projects on the ballot</EmptyTitle>
            <EmptyDescription>
              No submitted projects are available for voting yet.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      );
    }
    return (
      <>
        {ballotItems.map((item) => (
          <BallotCard
            isVoting={voteMutation.isPending || unvoteMutation.isPending}
            item={item}
            key={item.id}
            onUnvote={handleUnvote}
            onVote={handleVote}
          />
        ))}
        {hasMore ? (
          <div className="text-center">
            <Button
              className="w-full sm:w-auto"
              onClick={handleLoadMore}
              type="button"
              variant="outline"
            >
              Load more
            </Button>
          </div>
        ) : null}
      </>
    );
  })();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link
          className="mb-4 inline-flex items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
          to="/gallery"
        >
          <ArrowUpDownIcon className="size-4" />
          Back to Gallery
        </Link>
        <h1 className="font-bold font-display text-3xl text-foreground sm:text-4xl">
          Community Ballot
        </h1>
        <p className="mt-2 text-muted-foreground">
          Vote for your favorite projects. You have up to 3 votes per event.
        </p>
      </div>

      {/* Sort Controls */}
      <div className="mb-6 flex items-center gap-4">
        <label className="text-muted-foreground text-sm" htmlFor="ballot-sort">
          Sort by:
        </label>
        <select
          className="flex h-9 w-full max-w-xs items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          id="ballot-sort"
          onChange={handleSortChange}
          value={sortBy}
        >
          <option value="influence">Influence (√votes)</option>
          <option value="votes">Raw Votes</option>
          <option value="name">Name A-Z</option>
        </select>
      </div>

      {/* Ballot List */}
      <div className="space-y-4">{ballotContent}</div>

      {/* Voting Info */}
      <div className="mt-8 rounded-lg bg-muted/30 p-4 text-muted-foreground text-sm">
        <h3 className="mb-2 font-semibold text-foreground">How Voting Works</h3>
        <ul className="list-inside list-disc space-y-1">
          <li>Each voter can cast up to 3 votes per event.</li>
          <li>
            Influence is calculated using quadratic voting: √(number of votes).
          </li>
          <li>You can change your votes at any time before voting closes.</li>
          <li>
            {
              // biome-ignore lint/suspicious/noUnnecessaryConditions: biome approximates TanStack Query's overloaded useQuery return as a literal false; tsc infers `boolean`
              countsLoading
                ? "Loading vote counts..."
                : "Vote counts update in real time."
            }
          </li>
        </ul>
      </div>
    </div>
  );
}

function BallotCard({
  item,
  onVote,
  onUnvote,
  isVoting,
}: {
  item: BallotItem;
  onVote: (submissionId: string) => void;
  onUnvote: (submissionId: string) => void;
  isVoting: boolean;
}) {
  // Three distinct button states, resolved without a nested ternary.
  let voteIcon = <HeartOffIcon className="mr-2 h-4 w-4" />;
  let voteLabel = "Vote";
  if (isVoting) {
    voteIcon = <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />;
    voteLabel = "";
  } else if (item.userVoted) {
    voteIcon = <HeartIcon className="mr-2 h-4 w-4 fill-current" />;
    voteLabel = "Voted";
  }

  const handleToggle = useCallback(() => {
    if (item.userVoted) {
      onUnvote(item.id);
    } else {
      onVote(item.id);
    }
  }, [item.id, item.userVoted, onUnvote, onVote]);

  return (
    <Card className="flex flex-col gap-4 sm:flex-row" variant="interactive">
      <div className="relative aspect-video w-full max-w-xs shrink-0 overflow-hidden rounded-lg bg-muted">
        {item.thumbnailUrl ? (
          <img
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            height={360}
            src={item.thumbnailUrl}
            width={640}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground/50">
            <MessageSquareIcon className="size-12" />
          </div>
        )}
        {item.submittedAt ? (
          <div className="absolute bottom-2 left-2">
            <Badge className="text-xs" variant="subtle">
              Submitted {formatRelativeTime(item.submittedAt)}
            </Badge>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col">
        <CardHeader className="flex-1 pb-2">
          <CardTitle className="line-clamp-1 text-lg">{item.name}</CardTitle>
          {item.tagline ? (
            <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
              {item.tagline}
            </p>
          ) : null}
        </CardHeader>

        <CardContent className="flex flex-col justify-between p-0 pt-4">
          <div className="flex flex-wrap gap-2 text-muted-foreground text-xs">
            {item.trackId ? (
              <span className="flex items-center gap-1 rounded bg-muted px-2 py-0.5">
                <MessageSquareIcon className="size-3" />
                {item.trackId}
              </span>
            ) : null}
            <span className="flex items-center gap-1">
              <UsersIcon className="size-3" />
              {item.submittedAt
                ? formatRelativeTime(item.submittedAt)
                : "Pending"}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <HeartIcon className="size-4" />
                {item.voteCount} vote{item.voteCount === 1 ? "" : "s"}
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <ArrowUpDownIcon className="size-4" />
                {item.influence.toFixed(2)} influence
              </span>
            </div>

            <Button
              className={item.userVoted ? "bg-primary" : ""}
              disabled={isVoting}
              onClick={handleToggle}
              size="sm"
              variant={item.userVoted ? "default" : "outline"}
            >
              {voteIcon}
              {voteLabel}
            </Button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

function BallotItemSkeleton() {
  return (
    <Card variant="default">
      <div className="flex gap-4 sm:flex-row">
        <Skeleton className="aspect-video w-full max-w-xs shrink-0 rounded-lg" />
        <div className="flex flex-1 flex-col space-y-3 p-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <div className="mt-auto flex items-center justify-between">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </div>
    </Card>
  );
}
