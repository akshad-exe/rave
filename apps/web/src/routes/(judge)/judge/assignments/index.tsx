import { Badge } from "@rave/ui/components/badge";
import { Button } from "@rave/ui/components/button";
import { Card } from "@rave/ui/components/card";
import {
  Empty,
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
  CheckCircleIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  ClockIcon,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

function JudgeAssignmentsComponent() {
  const { data: myAssignments, status: assignmentsStatus } = useQuery(
    orpc.assignments.myAssignments.queryOptions({ eventId: "" })
  );
  const { data: myProgress } = useQuery(
    orpc.assignments.myProgress.queryOptions({ eventId: "" })
  );

  const skeletonKeys = Array.from({ length: 5 }, (_, i) => `skeleton-${i}`);

  if (assignmentsStatus === "pending" && !myAssignments) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-bold font-display text-3xl text-foreground">
              My Assignments
            </h1>
            <p className="mt-1 text-muted-foreground">
              Review and score your assigned submissions
            </p>
          </div>
          <div className="flex gap-2">
            <Badge
              variant={
                myProgress?.completed === myProgress?.total
                  ? "success"
                  : "outline"
              }
            >
              {myProgress?.completed ?? 0} / {myProgress?.total ?? 0} Complete
            </Badge>
          </div>
        </div>
        <div className="space-y-4">
          {skeletonKeys.map((key) => (
            <AssignmentCardSkeleton key={key} />
          ))}
        </div>
      </div>
    );
  }

  const hasAssignments = Boolean(myAssignments && myAssignments.length > 0);

  if (!hasAssignments) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-bold font-display text-3xl text-foreground">
              My Assignments
            </h1>
            <p className="mt-1 text-muted-foreground">
              Review and score your assigned submissions
            </p>
          </div>
          <div className="flex gap-2">
            <Badge
              variant={
                myProgress?.completed === myProgress?.total
                  ? "success"
                  : "outline"
              }
            >
              {myProgress?.completed ?? 0} / {myProgress?.total ?? 0} Complete
            </Badge>
          </div>
        </div>
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <ClipboardListIcon className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No assignments</EmptyTitle>
            <EmptyDescription>
              You haven't been assigned any submissions yet
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold font-display text-3xl text-foreground">
            My Assignments
          </h1>
          <p className="mt-1 text-muted-foreground">
            Review and score your assigned submissions
          </p>
        </div>
        <div className="flex gap-2">
          <Badge
            variant={
              myProgress?.completed === myProgress?.total
                ? "success"
                : "outline"
            }
          >
            {myProgress?.completed ?? 0} / {myProgress?.total ?? 0} Complete
          </Badge>
        </div>
      </div>
      <div className="space-y-4">
        {myAssignments?.map((assignment) => (
          <AssignmentCard assignment={assignment} key={assignment.id} />
        ))}
      </div>
    </div>
  );
}

function AssignmentCard({
  assignment,
}: {
  assignment: {
    id: string;
    status: string;
    assignedAt: string;
    completedAt: string | null;
    submissionId: string;
    trackId: string | null;
  };
}) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return {
          label: "Pending",
          variant: "outline" as const,
          icon: AlertCircleIcon,
          action: "Start Review",
        };
      case "in_progress":
        return {
          label: "In Progress",
          variant: "warning" as const,
          icon: ClockIcon,
          action: "Continue",
        };
      case "completed":
        return {
          label: "Completed",
          variant: "success" as const,
          icon: CheckCircleIcon,
          action: "View Score",
        };
      default:
        return {
          label: status,
          variant: "default" as const,
          icon: AlertCircleIcon,
          action: "View",
        };
    }
  };
  const config = getStatusConfig(assignment.status);
  const Icon = config.icon;
  const hasCompletedAt = Boolean(assignment.completedAt);
  const completedAt = assignment.completedAt ?? "";

  return (
    <Link className="block" to={`/judge/assignments/${assignment.id}`}>
      <Card className="p-5" variant="interactive">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-muted p-3">
              <Icon className="size-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                Submission #{assignment.submissionId.slice(-8)}
              </h3>
              <p className="text-muted-foreground text-sm">
                {assignment.trackId
                  ? `Track: ${assignment.trackId}`
                  : "General track"}
                • Assigned {formatRelativeTime(assignment.assignedAt)}
                {hasCompletedAt &&
                  ` • Completed ${formatRelativeTime(completedAt)}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="gap-1.5" variant={config.variant}>
              <Icon className="size-3" />
              {config.label}
            </Badge>
            <Button className="gap-1.5" size="sm" variant="outline">
              {config.action}
              <ChevronRightIcon className="size-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function AssignmentCardSkeleton() {
  return (
    <Card className="p-5" variant="default">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </Card>
  );
}

export const Route = createFileRoute("/(judge)/judge/assignments/")({
  component: JudgeAssignmentsComponent,
});
