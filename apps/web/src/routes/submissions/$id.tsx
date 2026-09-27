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
  ClockIcon,
  CodeIcon,
  ExternalLinkIcon,
  GlobeIcon,
  TagIcon,
  UsersIcon,
  VideoIcon,
} from "lucide-react";
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
  const {
    data: submission,
    status: submissionStatus,
    isError,
  } = useQuery(orpc.submissions.get.queryOptions({ submissionId: id }));

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
      </div>
    </div>
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

import { useParams } from "@tanstack/react-router";
