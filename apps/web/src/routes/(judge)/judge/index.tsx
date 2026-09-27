import { Badge } from "@rave/ui/components/badge";
import { Button } from "@rave/ui/components/button";
import { Card, CardContent } from "@rave/ui/components/card";
import { Progress } from "@rave/ui/components/progress";
import { Skeleton } from "@rave/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircleIcon,
  BarChartIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  ClockIcon,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/(judge)/judge/")({
  component: JudgeDashboardComponent,
});

function JudgeDashboardComponent() {
  const { data: myAssignments, status: assignmentsStatus } = useQuery(
    orpc.assignments.myAssignments.queryOptions({ eventId: "" })
  );
  const { data: myProgress, status: progressStatus } = useQuery(
    orpc.assignments.myProgress.queryOptions({ eventId: "" })
  );

  const completed = myProgress?.completed ?? 0;
  const total = myProgress?.total ?? 0;
  const inProgress = myProgress?.in_progress ?? 0;
  const pending = myProgress?.pending ?? 0;
  const completionPercent = myProgress?.completionPercent ?? 0;

  const hasAssignments = Boolean(myAssignments && myAssignments.length > 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-bold font-display text-3xl text-foreground">
          Judge Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">
          Review and score your assigned submissions
        </p>
      </div>

      {/* Progress Overview */}
      <Card variant="default">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-6">
              <div className="relative size-32">
                <Progress
                  className="size-32"
                  style={{ "--progress-radius": "9999px" }}
                  value={completionPercent}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-bold font-display text-2xl text-foreground">
                    {Math.round(completionPercent)}%
                  </span>
                </div>
              </div>
              <div>
                <h2 className="font-bold font-display text-2xl text-foreground">
                  Your Progress
                </h2>
                <p className="mt-1 text-muted-foreground">
                  {completed} of {total} assignments completed
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <ProgressStat
                color="success"
                icon={CheckCircleIcon}
                label="Completed"
                value={completed}
              />
              <ProgressStat
                color="warning"
                icon={ClockIcon}
                label="In Progress"
                value={inProgress}
              />
              <ProgressStat
                color="muted"
                icon={AlertCircleIcon}
                label="Pending"
                value={pending}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <section>
        <h2 className="mb-4 font-display font-semibold text-foreground text-xl">
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link to="/judge/assignments">
            <ActionCard
              description="See all your assigned submissions"
              icon={ClipboardListIcon}
              title="View Assignments"
            />
          </Link>
          <Link to="/judge/scoring">
            <ActionCard
              description="Continue where you left off"
              icon={CheckCircleIcon}
              title="Start Scoring"
            />
          </Link>
          <Link to="/judge/progress">
            <ActionCard
              description="Detailed progress breakdown"
              icon={BarChartIcon}
              title="View Progress"
            />
          </Link>
        </div>
      </section>

      {/* Upcoming Deadlines */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display font-semibold text-foreground text-xl">
            Upcoming Deadlines
          </h2>
          <Link to="/judge/assignments">
            <Button size="sm" variant="ghost">
              View all
            </Button>
          </Link>
        </div>
        {renderUpcomingDeadlines(assignmentsStatus, myAssignments)}
      </section>
    </div>
  );
}

function renderUpcomingDeadlines(
  assignmentsStatus: string,
  myAssignments:
    | {
        id: string;
        status: string;
        assignedAt: string;
        submissionId: string;
        trackId: string | null;
      }[]
    | undefined
) {
  if (assignmentsStatus === "pending") {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <AssignmentRowSkeleton key={`skeleton-${i}`} />
        ))}
      </div>
    );
  }

  const pendingAssignments =
    myAssignments
      ?.filter((a) => a.status === "pending" || a.status === "in_progress")
      .slice(0, 5) ?? [];

  if (pendingAssignments.length > 0) {
    return (
      <div className="space-y-3">
        {pendingAssignments.map((assignment) => (
          <AssignmentRow assignment={assignment} key={assignment.id} />
        ))}
      </div>
    );
  }

  return (
    <Card className="p-8 text-center" variant="default">
      <ClipboardListIcon className="mx-auto mb-4 size-12 text-muted-foreground/50" />
      <h3 className="font-semibold text-foreground text-lg">
        No assignments yet
      </h3>
      <p className="mt-2 text-muted-foreground">
        You'll see your assigned submissions here
      </p>
    </Card>
  );
}

function ProgressStat({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  const colorClasses = {
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    muted: "text-muted-foreground bg-muted",
  };

  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-4">
      <div className={`rounded-lg p-2 ${colorClasses[color]}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <p className="font-bold font-display text-foreground text-xl">
          {value}
        </p>
        <p className="text-muted-foreground text-sm">{label}</p>
      </div>
    </div>
  );
}

function AssignmentRow({
  assignment,
}: {
  assignment: {
    id: string;
    status: string;
    assignedAt: string;
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
        };
      case "in_progress":
        return {
          label: "In Progress",
          variant: "warning" as const,
          icon: ClockIcon,
        };
      case "completed":
        return {
          label: "Completed",
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
  const config = getStatusConfig(assignment.status);
  const Icon = config.icon;

  return (
    <Link className="block" to={`/judge/assignments/${assignment.id}`}>
      <Card
        className="flex items-center justify-between p-4"
        variant="borderless"
      >
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-muted p-2">
            <Icon className="size-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              Submission #{assignment.submissionId.slice(-8)}
            </p>
            <p className="text-muted-foreground text-sm">
              {assignment.trackId ? `Track: ${assignment.trackId}` : "No track"}
              • Assigned {formatRelativeTime(assignment.assignedAt)}
            </p>
          </div>
        </div>
        <Badge className="gap-1.5" variant={config.variant}>
          <Icon className="size-3" />
          {config.label}
        </Badge>
      </Card>
    </Link>
  );
}

function AssignmentRowSkeleton() {
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
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
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
  );
}

export const Route = createFileRoute("/(judge)/judge/")({
  component: JudgeDashboardComponent,
});
