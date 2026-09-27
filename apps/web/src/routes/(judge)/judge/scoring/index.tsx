import { Alert } from "@rave/ui/components/alert";
import { Badge } from "@rave/ui/components/badge";
import { Button } from "@rave/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rave/ui/components/card";
import { Separator } from "@rave/ui/components/separator";
import { Skeleton } from "@rave/ui/components/skeleton";
import { Textarea } from "@rave/ui/components/textarea";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  CodeIcon,
  ExternalLinkIcon,
  GlobeIcon,
  SaveIcon,
  VideoIcon,
} from "lucide-react";
import type * as React from "react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { type client, orpc } from "@/utils/orpc";

type RubricDetail = Awaited<ReturnType<typeof client.rubrics.get>>;
type RubricCriterion = RubricDetail["criteria"][number];

type AssignmentSummary = NonNullable<
  Awaited<ReturnType<typeof client.assignments.myAssignments>>
>[number];

export const Route = createFileRoute("/(judge)/judge/scoring/")({
  component: JudgeScoringComponent,
});

function JudgeScoringComponent() {
  const { data: myAssignments, status: assignmentsStatus } = useQuery(
    orpc.assignments.myAssignments.queryOptions({ eventId: "" })
  );

  const assignments = useMemo(() => myAssignments ?? [], [myAssignments]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Fall back to the first unfinished assignment instead of writing to state
  // during render, which React disallows and which re-renders in a loop.
  const activeId =
    selectedId ??
    assignments.find((a) => a.status !== "completed")?.id ??
    assignments[0]?.id ??
    null;

  const assignment = assignments.find((a) => a.id === activeId) ?? null;

  const { data: assignmentDetail, status: detailStatus } = useQuery(
    orpc.assignments.getAssignedSubmission.queryOptions(
      { assignmentId: activeId ?? "" },
      { enabled: activeId !== null }
    )
  );

  const rubricId = assignmentDetail?.assignment.rubricId ?? null;

  const { data: rubric } = useQuery(
    orpc.rubrics.get.queryOptions(
      { rubricId: rubricId ?? "" },
      { enabled: rubricId !== null }
    )
  );

  const { data: myScore } = useQuery(
    orpc.scoring.getMyScore.queryOptions(
      { assignmentId: activeId ?? "" },
      { enabled: activeId !== null }
    )
  );

  const criteria = useMemo(() => rubric?.criteria ?? [], [rubric]);

  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setScores({});
    setFeedback("");
  }, []);

  const handleScoreChange = useCallback(
    (criterionId: string, value: number) => {
      setScores((prev) => ({ ...prev, [criterionId]: value }));
    },
    []
  );

  const handleFeedbackChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setFeedback(event.target.value);
    },
    []
  );

  const isComplete =
    criteria.length > 0 && Object.keys(scores).length === criteria.length;

  const totalScore = useMemo(
    () =>
      criteria.reduce(
        (sum, c) => sum + (scores[c.id] ?? 0) * (Number(c.weight) / 100),
        0
      ),
    [criteria, scores]
  );

  const handleSubmit = useCallback(async () => {
    if (!(activeId && rubricId)) {
      return;
    }
    if (!isComplete) {
      toast.error("Please score all criteria");
      return;
    }

    setIsSubmitting(true);
    try {
      await orpc.scoring.submit.mutate({
        assignmentId: activeId,
        criterionScores: criteria.map((c) => ({
          criterionId: c.id,
          score: scores[c.id] ?? c.minScore,
        })),
        feedback: feedback || undefined,
        rubricId,
      });
      toast.success("Score submitted successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit score"
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [activeId, rubricId, criteria, scores, feedback, isComplete]);

  if (assignmentsStatus === "pending" || detailStatus === "pending") {
    return <ScoringSkeleton />;
  }

  if (assignments.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <Alert
          description="You have no assignments yet. An organizer assigns submissions before the judging window opens."
          title="No assignments"
          variant="info"
        />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <Alert
          description="Select an assignment from the list to score it."
          title="No assignment selected"
          variant="info"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-4">
        <aside className="space-y-6 lg:col-span-1">
          <Card variant="default">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Your Assignments
                <Badge variant="subtle">{assignments.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {assignments.map((a) => (
                  <AssignmentSidebarItem
                    assignment={a}
                    isSelected={a.id === activeId}
                    key={a.id}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>

        <div className="space-y-6 lg:col-span-3">
          <SubmissionOverview
            assignment={assignment}
            submission={assignmentDetail?.submission}
            totalScore={totalScore}
          />

          <Card variant="default">
            <CardHeader>
              <CardTitle>Scoring Criteria</CardTitle>
              <CardDescription>
                {rubric
                  ? `Rate each criterion from ${criteria[0]?.minScore ?? 0} to ${criteria[0]?.maxScore ?? 10}. Weights are applied automatically.`
                  : "This assignment has no rubric attached."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-0">
              {myScore?.isLocked ? (
                <Alert
                  description="Scores for this event are locked and can no longer be changed."
                  title="Scores locked"
                  variant="warning"
                />
              ) : null}

              {criteria.map((criterion) => (
                <ScoringCriterion
                  criterion={criterion}
                  disabled={Boolean(myScore?.isLocked) || isSubmitting}
                  key={criterion.id}
                  onChange={handleScoreChange}
                  score={scores[criterion.id]}
                />
              ))}

              <Separator className="my-4" />

              <div>
                <label
                  className="mb-2 block font-medium text-foreground text-sm"
                  htmlFor="scoring-feedback"
                >
                  Feedback (optional)
                </label>
                <Textarea
                  disabled={Boolean(myScore?.isLocked)}
                  id="scoring-feedback"
                  onChange={handleFeedbackChange}
                  placeholder="Provide constructive feedback for the team..."
                  rows={4}
                  value={feedback}
                />
              </div>

              <div className="flex justify-end gap-3 border-border border-t pt-4">
                <Button
                  disabled={
                    isSubmitting || !isComplete || Boolean(myScore?.isLocked)
                  }
                  onClick={handleSubmit}
                  type="button"
                  variant="outline"
                >
                  <SaveIcon className="size-4" />
                  Save as Draft
                </Button>
                <Button
                  className="gap-2"
                  disabled={
                    isSubmitting || !isComplete || Boolean(myScore?.isLocked)
                  }
                  onClick={handleSubmit}
                  type="button"
                >
                  {isSubmitting ? "Submitting..." : "Submit Score"}
                  <ChevronRightIcon className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SubmissionOverview({
  assignment,
  submission,
  totalScore,
}: {
  assignment: AssignmentSummary;
  submission:
    | Awaited<
        ReturnType<typeof client.assignments.getAssignedSubmission>
      >["submission"]
    | undefined;
  totalScore: number;
}) {
  const statusMeta = getAssignmentStatusMeta(assignment.status);

  const links = [
    {
      icon: CodeIcon,
      label: "Repository",
      url: submission?.repositoryUrl ?? null,
    },
    {
      icon: GlobeIcon,
      label: "Live Demo",
      url: submission?.liveDemoUrl ?? null,
    },
    {
      icon: VideoIcon,
      label: "Video",
      url: submission?.demoVideoUrl ?? null,
    },
  ];

  return (
    <Card variant="default">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
              {submission?.trackId ? (
                <Badge variant="subtle">{submission.trackId}</Badge>
              ) : null}
            </div>
            <h2 className="font-bold font-display text-foreground text-xl">
              {submission?.name ?? "Loading..."}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="font-bold font-display text-3xl text-primary">
                {totalScore.toFixed(1)}
              </p>
              <p className="text-muted-foreground text-sm">Weighted Total</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {links.map((item) => (
            <div className="rounded-lg bg-muted/30 p-3" key={item.label}>
              <div className="mb-1 flex items-center gap-2 text-muted-foreground text-sm">
                <item.icon className="size-4" />
                <span>{item.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">{item.url ? "Linked" : "—"}</span>
                {item.url ? (
                  <a
                    className="text-primary text-sm hover:underline"
                    href={item.url}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    View <ExternalLinkIcon className="ml-1 size-3.5" />
                  </a>
                ) : null}
              </div>
            </div>
          ))}
          <div className="rounded-lg bg-muted/30 p-3">
            <div className="mb-1 flex items-center gap-2 text-muted-foreground text-sm">
              <CheckCircleIcon className="size-4" />
              <span>Team</span>
            </div>
            <span className="font-medium">
              {submission?.teamId ? "Team" : "Individual"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getAssignmentStatusMeta(status: string): {
  icon: typeof AlertCircleIcon;
  label: string;
  variant: "outline" | "success" | "warning";
} {
  switch (status) {
    case "in_progress": {
      return { icon: ClockIcon, label: "In Progress", variant: "warning" };
    }
    case "completed": {
      return { icon: CheckCircleIcon, label: "Scored", variant: "success" };
    }
    default: {
      return { icon: AlertCircleIcon, label: "Pending", variant: "outline" };
    }
  }
}

function AssignmentSidebarItem({
  assignment,
  isSelected,
  onSelect,
}: {
  assignment: AssignmentSummary;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const config = getAssignmentStatusMeta(assignment.status);
  const Icon = config.icon;

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const { assignmentId } = event.currentTarget.dataset;
      if (assignmentId) {
        onSelect(assignmentId);
      }
    },
    [onSelect]
  );

  return (
    <button
      className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${isSelected ? "border border-primary bg-primary/10 text-primary" : "text-foreground hover:bg-muted"}`}
      data-assignment-id={assignment.id}
      onClick={handleClick}
      type="button"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          Submission #{assignment.submissionId.slice(-8)}
        </p>
        <p className="text-muted-foreground text-xs">
          {assignment.trackId ?? "General"}
        </p>
      </div>
      <Badge className="gap-1" variant={config.variant}>
        <Icon className="size-3" />
        {assignment.status}
      </Badge>
    </button>
  );
}

function ScoringCriterion({
  criterion,
  score,
  disabled,
  onChange,
}: {
  criterion: RubricCriterion;
  disabled: boolean;
  score: number | undefined;
  onChange: (criterionId: string, score: number) => void;
}) {
  const options = Array.from(
    { length: criterion.maxScore - criterion.minScore + 1 },
    (_, i) => criterion.minScore + i
  );

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const { criterionId, value } = event.currentTarget.dataset;
      if (criterionId && value) {
        onChange(criterionId, Number(value));
      }
    },
    [onChange]
  );

  return (
    <div className="rounded-lg bg-muted/30 p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h4 className="font-medium text-foreground">{criterion.name}</h4>
            <Badge variant="subtle">{Number(criterion.weight)}% weight</Badge>
          </div>
          {criterion.description ? (
            <p className="text-muted-foreground text-sm">
              {criterion.description}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 font-bold font-display text-lg text-primary">
          {score ?? "—"}
          <span className="text-muted-foreground">/ {criterion.maxScore}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {options.map((value) => (
          <button
            className={`flex h-10 w-10 items-center justify-center rounded-lg font-medium text-sm transition-all disabled:cursor-not-allowed disabled:opacity-50 ${score === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/50"}`}
            data-criterion-id={criterion.id}
            data-value={value}
            disabled={disabled}
            key={value}
            onClick={handleClick}
            type="button"
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}

function ScoringSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-4">
        <aside className="lg:col-span-1">
          <Card variant="default">
            <CardContent className="space-y-2 pt-0">
              {["a", "b", "c", "d", "e"].map((slot) => (
                <Skeleton className="h-12 w-full" key={slot} />
              ))}
            </CardContent>
          </Card>
        </aside>
        <div className="space-y-6 lg:col-span-3">
          <Card variant="default">
            <CardContent className="space-y-4 pt-0">
              <Skeleton className="h-24 w-full" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {["a", "b", "c", "d"].map((slot) => (
                  <Skeleton className="h-20" key={slot} />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card variant="default">
            <CardContent className="space-y-6 pt-0">
              {["a", "b", "c"].map((slot) => (
                <Skeleton className="h-24" key={slot} />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
