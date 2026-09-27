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
import { useCallback, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  CodeIcon,
  EditIcon,
  GlobeIcon,
  PlusIcon,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/(dashboard)/dashboard/submissions/")({
  component: SubmissionsComponent,
});

function SubmissionsComponent() {
  const { data: mySubmissions, status: queryStatus } = useQuery(
    orpc.submissions.mySubmissions.queryOptions()
  );

  const getStatusConfig = useCallback((status: string) => {
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
  }, []);

  const skeletonKeys = Array.from({ length: 5 }, (_, i) => `skeleton-${i}`);

  if (queryStatus === "pending" && !mySubmissions) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-bold font-display text-3xl text-foreground">
              My Submissions
            </h1>
            <p className="mt-1 text-muted-foreground">
              Manage your project submissions
            </p>
          </div>
          <Link to="/submit">
            <Button className="gap-2">
              <PlusIcon className="size-4" />
              New Submission
            </Button>
          </Link>
        </div>
        <div className="space-y-3">
          {skeletonKeys.map((key) => (
            <SubmissionRowSkeleton key={key} />
          ))}
        </div>
      </div>
    );
  }

  const hasSubmissions = Boolean(mySubmissions && mySubmissions.length > 0);

  if (!hasSubmissions) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-bold font-display text-3xl text-foreground">
              My Submissions
            </h1>
            <p className="mt-1 text-muted-foreground">
              Manage your project submissions
            </p>
          </div>
          <Link to="/submit">
            <Button className="gap-2">
              <PlusIcon className="size-4" />
              New Submission
            </Button>
          </Link>
        </div>
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <CodeIcon className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No submissions yet</EmptyTitle>
            <EmptyDescription>
              Create your first project submission for a hackathon
            </EmptyDescription>
          </EmptyHeader>
          <EmptyAction>
            <Link to="/submit">
              <Button>Create Submission</Button>
            </Link>
          </EmptyAction>
        </Empty>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold font-display text-3xl text-foreground">
            My Submissions
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your project submissions
          </p>
        </div>
        <Link to="/submit">
          <Button className="gap-2">
            <PlusIcon className="size-4" />
            New Submission
          </Button>
        </Link>
      </div>
      <div className="space-y-3">
        {mySubmissions?.map((submission) => (
          <SubmissionRow
            getStatusConfig={getStatusConfig}
            key={submission.id}
            submission={submission}
          />
        ))}
      </div>
    </div>
  );
}

interface SubmissionRowProps {
  getStatusConfig: (status: string) => {
    label: string;
    variant: "default" | "outline" | "success" | "error";
    icon: React.ComponentType<{ className?: string }>;
  };
  submission: {
    id: string;
    name: string;
    status: string;
    submittedAt: string | null;
    trackId: string | null;
    description: string | null;
    repositoryUrl: string | null;
    liveDemoUrl: string | null;
  };
}

function SubmissionRow({ submission, getStatusConfig }: SubmissionRowProps) {
  const config = getStatusConfig(submission.status);
  const Icon = config.icon;
  const hasLiveDemo = Boolean(submission.liveDemoUrl);
  const hasTrackId = Boolean(submission.trackId);
  const hasSubmittedAt = Boolean(submission.submittedAt);
  const hasDescription = Boolean(submission.description);
  const liveDemoUrl = submission.liveDemoUrl ?? "";
  const submittedAt = submission.submittedAt ?? "";

  return (
    <Card className="p-4" variant="borderless">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="rounded-lg bg-muted p-2">
            <CodeIcon className="size-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-medium text-foreground">
              {submission.name}
            </h3>
            <p className="truncate text-muted-foreground text-sm">
              {hasTrackId
                ? `Track: ${submission.trackId}`
                : "No track assigned"}
              {hasSubmittedAt &&
                ` • Submitted ${formatRelativeTime(submittedAt)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="gap-1.5" variant={config.variant}>
            <Icon className="size-3" />
            {config.label}
          </Badge>
          <Link to={`/submissions/${submission.id}`}>
            <Button className="gap-1.5" size="sm" variant="ghost">
              <EditIcon className="size-3.5" />
              Edit
            </Button>
          </Link>
          {hasLiveDemo && (
            <a href={liveDemoUrl} rel="noopener noreferrer" target="_blank">
              <Button className="gap-1.5" size="sm" variant="ghost">
                <GlobeIcon className="size-3.5" />
                Demo
              </Button>
            </a>
          )}
        </div>
      </div>
      {hasDescription && (
        <p className="mt-3 line-clamp-2 text-muted-foreground text-sm">
          {submission.description}
        </p>
      )}
    </Card>
  );
}

function SubmissionRowSkeleton() {
  return (
    <Card className="p-4" variant="borderless">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </Card>
  );
}
