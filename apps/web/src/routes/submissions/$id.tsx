import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@rave/ui/components/avatar";
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
  EmptyAction,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@rave/ui/components/empty";
import { Skeleton } from "@rave/ui/components/skeleton";
import { Textarea } from "@rave/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  AlertCircleIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  CodeIcon,
  ExternalLinkIcon,
  GlobeIcon,
  MessageSquareIcon,
  TagIcon,
  Trash2Icon,
  UsersIcon,
  VideoIcon,
} from "lucide-react";
import type * as React from "react";
import { useCallback, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { formatRelativeTime } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

function getStatusConfig(status: string): {
  icon: typeof AlertCircleIcon;
  label: string;
  variant: "outline" | "success" | "default";
} {
  switch (status) {
    case "draft": {
      return { icon: AlertCircleIcon, label: "Draft", variant: "outline" };
    }
    case "submitted": {
      return { icon: CheckCircleIcon, label: "Submitted", variant: "success" };
    }
    default: {
      return { icon: AlertCircleIcon, label: status, variant: "default" };
    }
  }
}

export const Route = createFileRoute("/submissions/$id")({
  component: SubmissionDetailComponent,
});

function SubmissionDetailComponent() {
  const { id } = useParams({ from: "/submissions/$id", strict: true });
  const queryClient = useQueryClient();

  const {
    data: submission,
    status: submissionStatus,
    isError,
  } = useQuery(
    orpc.submissions.get.queryOptions({ input: { submissionId: id } })
  );

  // Fetch comments for this submission
  const { data: commentsData, isLoading: commentsLoading } = useQuery(
    orpc.comments.list.queryOptions({
      input: { submissionId: id, limit: 50, page: 1 },
    })
  );

  // Get current user session
  const { data: session } = authClient.useSession();

  if (submissionStatus === "pending") {
    return <SubmissionDetailSkeleton />;
  }

  if (isError || !submission) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <CodeIcon className="size-6" />
            </EmptyMedia>
            <EmptyTitle>Submission not found</EmptyTitle>
            <EmptyDescription>
              The submission you're looking for doesn't exist or has been
              removed.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyAction>
            <Link to="/gallery">
              <Button>Browse Gallery</Button>
            </Link>
          </EmptyAction>
        </Empty>
      </div>
    );
  }

  const config = getStatusConfig(submission.status);
  const Icon = config.icon;

  // Create comment mutation
  const createCommentMutation = useMutation(
    orpc.comments.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["comments", "list", id] });
      },
    })
  );

  // Delete comment mutation
  const deleteCommentMutation = useMutation(
    orpc.comments.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["comments", "list", id] });
      },
    })
  );

  const [newComment, setNewComment] = useState("");

  const handleSubmitComment = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!newComment.trim()) {
        return;
      }
      createCommentMutation.mutate({
        content: newComment.trim(),
        submissionId: id,
      });
      setNewComment("");
    },
    [createCommentMutation, id, newComment]
  );

  const handleDeleteComment = useCallback(
    (commentId: string) => {
      if (!confirm("Are you sure you want to delete this comment?")) {
        return;
      }
      deleteCommentMutation.mutate({ commentId });
    },
    [deleteCommentMutation]
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge className="gap-1.5" variant={config.variant}>
                <Icon className="size-3" />
                {config.label}
              </Badge>
              {submission.trackId ? (
                <Badge className="gap-1.5" variant="subtle">
                  <TagIcon className="size-3" />
                  {submission.trackId}
                </Badge>
              ) : null}
            </div>
            <h1 className="font-bold font-display text-3xl text-foreground">
              {submission.name}
            </h1>
            {submission.tagline ? (
              <p className="mt-2 text-lg text-muted-foreground">
                {submission.tagline}
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            {submission.liveDemoUrl ? (
              <a
                href={submission.liveDemoUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                <Button className="gap-2" variant="outline">
                  <GlobeIcon className="size-4" />
                  Live Demo
                </Button>
              </a>
            ) : null}
            {submission.repositoryUrl ? (
              <a
                href={submission.repositoryUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                <Button className="gap-2" variant="outline">
                  <CodeIcon className="size-4" />
                  Repository
                </Button>
              </a>
            ) : null}
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/30 p-4 md:grid-cols-4">
          <MetaItem
            icon={CalendarIcon}
            label="Submitted"
            value={
              submission.submittedAt
                ? formatRelativeTime(submission.submittedAt)
                : "Not submitted"
            }
          />
          <MetaItem
            icon={UsersIcon}
            label="Team"
            value={submission.teamId ? "Team project" : "Individual"}
          />
          <MetaItem
            icon={ClockIcon}
            label="Updated"
            value={formatRelativeTime(submission.updatedAt)}
          />
          <MetaItem
            icon={TagIcon}
            label="Tech Tags"
            value={
              submission.techTags?.length
                ? `${submission.techTags.length} tags`
                : "None"
            }
          />
        </div>
      </div>

      {/* Thumbnail */}
      {submission.thumbnailUrl ? (
        <div className="mb-8 aspect-video w-full overflow-hidden rounded-lg">
          <img
            alt=""
            className="h-full w-full object-cover"
            height={720}
            src={submission.thumbnailUrl}
            width={1280}
          />
        </div>
      ) : null}

      {/* Content Sections */}
      <div className="space-y-8">
        {/* Description */}
        {submission.description ? (
          <section>
            <h2 className="mb-4 font-display font-semibold text-foreground text-xl">
              Description
            </h2>
            <div className="prose prose-muted max-w-none whitespace-pre-wrap text-muted-foreground">
              {submission.description}
            </div>
          </section>
        ) : null}

        {/* Links */}
        <section>
          <h2 className="mb-4 font-display font-semibold text-foreground text-xl">
            Links
          </h2>
          <div className="flex flex-wrap gap-3">
            {submission.repositoryUrl ? (
              <Link
                rel="noopener noreferrer"
                target="_blank"
                to={submission.repositoryUrl}
              >
                <Button className="gap-2" variant="outline">
                  <CodeIcon className="size-4" />
                  Repository
                  <ExternalLinkIcon className="size-3.5" />
                </Button>
              </Link>
            ) : null}
            {submission.liveDemoUrl ? (
              <Link
                rel="noopener noreferrer"
                target="_blank"
                to={submission.liveDemoUrl}
              >
                <Button className="gap-2" variant="outline">
                  <GlobeIcon className="size-4" />
                  Live Demo
                  <ExternalLinkIcon className="size-3.5" />
                </Button>
              </Link>
            ) : null}
            {submission.demoVideoUrl ? (
              <Link
                rel="noopener noreferrer"
                target="_blank"
                to={submission.demoVideoUrl}
              >
                <Button className="gap-2" variant="outline">
                  <VideoIcon className="size-4" />
                  Demo Video
                  <ExternalLinkIcon className="size-3.5" />
                </Button>
              </Link>
            ) : null}
          </div>
        </section>

        {/* Gallery */}
        {submission.galleryImageUrls.length > 0 ? (
          <section>
            <h2 className="mb-4 font-display font-semibold text-foreground text-xl">
              Gallery
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {submission.galleryImageUrls.map((url) => (
                <div
                  className="aspect-video w-full overflow-hidden rounded-lg"
                  key={url}
                >
                  <img
                    alt="Project screenshot"
                    className="h-full w-full object-cover"
                    height={360}
                    src={url}
                    width={640}
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Tech Stack */}
        {submission.techTags.length > 0 ? (
          <section>
            <h2 className="mb-4 font-display font-semibold text-foreground text-xl">
              Tech Stack
            </h2>
            <div className="flex flex-wrap gap-2">
              {submission.techTags.map((tag) => (
                <Badge className="gap-1.5" key={tag} variant="subtle">
                  <CodeIcon className="size-3" />
                  {tag}
                </Badge>
              ))}
            </div>
          </section>
        ) : null}

        {/* Custom Answers */}
        {submission.customAnswers.length > 0 ? (
          <section>
            <h2 className="mb-4 font-display font-semibold text-foreground text-xl">
              Additional Information
            </h2>
            <div className="space-y-4">
              {submission.customAnswers.map((answer) => (
                <Card
                  className="p-4"
                  key={answer.questionId}
                  variant="borderless"
                >
                  <p className="font-medium text-foreground">
                    {answer.questionId}
                  </p>
                  <p className="mt-1 text-muted-foreground text-sm">
                    {answer.answer}
                  </p>
                </Card>
              ))}
            </div>
          </section>
        ) : null}

        {/* Comments */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display font-semibold text-foreground text-xl">
              Comments
            </h2>
            <span className="text-muted-foreground text-sm">
              {commentsData?.length ?? 0} comment
              {commentsData?.length === 1 ? "" : "s"}
            </span>
          </div>

          {/* Comment Form */}
          {session?.user ? (
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Add a comment</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitComment}>
                  <div className="flex gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage
                        alt={session.user.name}
                        src={session.user.image ?? ""}
                      />
                      <AvatarFallback>
                        {session.user.name?.[0]?.toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Textarea
                        className="mb-2 min-h-[80px]"
                        disabled={createCommentMutation.isPending}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                        value={newComment}
                      />
                      <div className="flex justify-end">
                        <Button
                          disabled={
                            createCommentMutation.isPending ||
                            !newComment.trim()
                          }
                          type="submit"
                        >
                          {createCommentMutation.isPending ? (
                            <>
                              <svg
                                className="mr-2 h-4 w-4 animate-spin"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  fill="none"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  d="M12 2a10 10 0 0 1 10 10"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeLinecap="round"
                                  strokeWidth="4"
                                />
                              </svg>
                              Posting...
                            </>
                          ) : (
                            "Post Comment"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <div className="mb-6 rounded-lg bg-muted/30 p-4 text-center text-muted-foreground text-sm">
              <Link
                className="font-medium text-primary hover:underline"
                to="/login"
              >
                Sign in
              </Link>{" "}
              to add a comment
            </div>
          )}

          {/* Comment List */}
          <div className="space-y-4">
            {commentsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <CommentSkeleton key={i} />
              ))
            ) : commentsData && commentsData.length > 0 ? (
              commentsData.map((comment) => (
                <CommentItem
                  comment={comment}
                  currentUserId={session?.user?.id}
                  isAuthor={comment.authorId === session?.user?.id}
                  isDeleting={
                    deleteCommentMutation.isPending &&
                    deleteCommentMutation.variables?.commentId === comment.id
                  }
                  key={comment.id}
                  onDelete={handleDeleteComment}
                />
              ))
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia>
                    <MessageSquareIcon className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle>No comments yet</EmptyTitle>
                  <EmptyDescription>
                    Be the first to share your thoughts on this project.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

interface CommentItemProps {
  comment: {
    authorId: string;
    content: string;
    createdAt: Date | string;
    id: string;
    isDeleted: number;
  };
  currentUserId: string | undefined;
  isAuthor: boolean;
  isDeleting: boolean;
  onDelete: (commentId: string) => void;
}

function CommentItem({
  comment,
  currentUserId,
  isAuthor,
  isDeleting,
  onDelete,
}: CommentItemProps) {
  const isDeleted = comment.isDeleted === 1;
  const createdAt = new Date(comment.createdAt);

  return (
    <Card className={isDeleted ? "opacity-60" : ""} variant="borderless">
      <CardContent className="pt-4 pb-2">
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {isDeleted ? "[deleted]" : "User"}
              </span>
              <span className="text-muted-foreground text-xs">
                {formatRelativeTime(createdAt)}
              </span>
            </div>
            <p className="{isDeleted ? 'text-muted-foreground italic' : 'text-foreground'} mt-1 text-sm">
              {isDeleted ? "[This comment has been deleted]" : comment.content}
            </p>
            {isAuthor && !isDeleted && (
              <div className="mt-2 flex items-center gap-2">
                <Button
                  className="text-error hover:bg-error/10 hover:text-error"
                  disabled={isDeleting}
                  onClick={() => onDelete(comment.id)}
                  size="sm"
                  variant="ghost"
                >
                  {isDeleting ? (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        fill="none"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        d="M12 2a10 10 0 0 1 10 10"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="4"
                      />
                    </svg>
                  ) : (
                    <>
                      <Trash2Icon className="mr-1.5 h-3.5 w-3.5" />
                      Delete
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CommentSkeleton() {
  return (
    <Card variant="borderless">
      <CardContent className="pt-4 pb-2">
        <div className="flex gap-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
        <Icon className="size-4" />
        <span>{label}</span>
      </div>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function SubmissionDetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex gap-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-10 w-3/4" />
      </div>
      <Skeleton className="aspect-video w-full rounded-lg" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
