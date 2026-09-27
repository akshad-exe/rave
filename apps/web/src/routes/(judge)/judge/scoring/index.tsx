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
import { useState } from "react";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/(judge)/judge/scoring/")({
  component: JudgeScoringComponent,
});

function JudgeScoringComponent() {
  const { data: myAssignments, isLoading } = useQuery(
    orpc.assignments.myAssignments.queryOptions({ eventId: "" })
  );
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(
    null
  );

  // Auto-select first pending/in_progress assignment
  if (!selectedAssignment && myAssignments && !isLoading) {
    const pending = myAssignments.find(
      (a) => a.status === "pending" || a.status === "in_progress"
    );
    if (pending) {
      setSelectedAssignment(pending.id);
    }
  }

  const assignment = myAssignments?.find((a) => a.id === selectedAssignment);

  if (isLoading) {
    return <ScoringSkeleton />;
  }

  if (!assignment) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <Alert
          description="Select an assignment from the sidebar or complete all your current assignments."
          title="No assignment selected"
          variant="info"
        />
      </div>
    );
  }

  const { data: assignmentDetail, isLoading: detailLoading } = useQuery(
    orpc.assignments.getAssignedSubmission.queryOptions({
      assignmentId: assignment.id,
    })
  );

  const { data: myScore, isLoading: scoreLoading } = useQuery(
    orpc.scoring.getMyScore.queryOptions({ assignmentId: assignment.id })
  );

  if (detailLoading) {
    return <ScoringSkeleton />;
  }

  const submission = assignmentDetail?.submission;
  const rubric = assignmentDetail?.assignment.rubricId
    ? { criteria: [] }
    : null; // Would be fetched separately

  // For now, mock rubric criteria
  const mockCriteria = [
    {
      id: "crit_functionality",
      name: "Functionality",
      description: "Does the project work as intended?",
      weight: 40,
      minScore: 1,
      maxScore: 5,
    },
    {
      id: "crit_innovation",
      name: "Innovation",
      description: "How novel and creative is the approach?",
      weight: 30,
      minScore: 1,
      maxScore: 5,
    },
    {
      id: "crit_quality",
      name: "Quality",
      description: "Code quality, design, and polish",
      weight: 30,
      minScore: 1,
      maxScore: 5,
    },
  ];

  const [scores, setScores] = useState<Record<string, number>>(
    myScore?.criterionScores?.reduce(
      (acc, cs) => ({ ...acc, [cs.criterionId]: cs.score }),
      {}
    ) ?? {}
  );
  const [feedback, setFeedback] = useState(myScore?.feedback ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScoreChange = (criterionId: string, score: number) => {
    setScores((prev) => ({ ...prev, [criterionId]: score }));
  };

  const handleSubmit = async () => {
    if (Object.keys(scores).length !== mockCriteria.length) {
      toast.error("Please score all criteria");
      return;
    }

    setIsSubmitting(true);
    try {
      await orpc.scoring.submit.mutate(
        {
          assignmentId: assignment.id,
          rubricId: assignmentDetail?.assignment.rubricId ?? "",
          criterionScores: mockCriteria.map((c) => ({
            criterionId: c.id,
            score: scores[c.id],
          })),
          feedback: feedback || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Score submitted successfully");
          },
          onError: (error) => {
            toast.error(error.message || "Failed to submit score");
          },
        }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalScore = mockCriteria.reduce(
    (sum, c) => sum + (scores[c.id] ?? 0) * (c.weight / 100),
    0
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-4">
        {/* Sidebar - Assignment List */}
        <aside className="space-y-6 lg:col-span-1">
          <Card variant="default">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Your Assignments
                <Badge variant="subtle">{myAssignments?.length ?? 0}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {myAssignments?.map((a) => (
                  <AssignmentSidebarItem
                    assignment={a}
                    isSelected={a.id === selectedAssignment}
                    key={a.id}
                    onClick={() => setSelectedAssignment(a.id)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Main - Scoring Interface */}
        <div className="space-y-6 lg:col-span-3">
          {/* Submission Overview */}
          <Card variant="default">
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Badge
                      variant={
                        assignment.status === "completed"
                          ? "success"
                          : assignment.status === "in_progress"
                            ? "warning"
                            : "outline"
                      }
                    >
                      {assignment.status === "completed"
                        ? "Scored"
                        : assignment.status === "in_progress"
                          ? "In Progress"
                          : "Pending"}
                    </Badge>
                    {submission?.trackId && (
                      <Badge variant="subtle">{submission.trackId}</Badge>
                    )}
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
                    <p className="text-muted-foreground text-sm">
                      Weighted Total
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {submission &&
                  [
                    {
                      label: "Repository",
                      value: submission.repositoryUrl ? "Linked" : "—",
                      icon: CodeIcon,
                      url: submission.repositoryUrl,
                    },
                    {
                      label: "Live Demo",
                      value: submission.liveDemoUrl ? "Linked" : "—",
                      icon: GlobeIcon,
                      url: submission.liveDemoUrl,
                    },
                    {
                      label: "Video",
                      value: submission.demoVideoUrl ? "Linked" : "—",
                      icon: VideoIcon,
                      url: submission.demoVideoUrl,
                    },
                    {
                      label: "Team",
                      value: submission.teamId ? "Team" : "Individual",
                      icon: CheckCircleIcon,
                      url: null,
                    },
                  ].map((item) => (
                    <div
                      className="rounded-lg bg-muted/30 p-3"
                      key={item.label}
                    >
                      <div className="mb-1 flex items-center gap-2 text-muted-foreground text-sm">
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{item.value}</span>
                        {item.url && (
                          <a
                            className="text-primary text-sm hover:underline"
                            href={item.url}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            View <ExternalLinkIcon className="ml-1 size-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Scoring Form */}
          <Card variant="default">
            <CardHeader>
              <CardTitle>Scoring Criteria</CardTitle>
              <CardDescription>
                Rate each criterion from 1-5. Weights are applied automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-0">
              {mockCriteria.map((criterion) => (
                <ScoringCriterion
                  criterion={criterion}
                  key={criterion.id}
                  onChange={(score) => handleScoreChange(criterion.id, score)}
                  score={scores[criterion.id]}
                />
              ))}
              <Separator className="my-4" />
              <div>
                <label className="mb-2 block font-medium text-foreground text-sm">
                  Feedback (optional)
                </label>
                <Textarea
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Provide constructive feedback for the team..."
                  rows={4}
                  value={feedback}
                />
              </div>
              <div className="flex justify-end gap-3 border-border border-t pt-4">
                <Button
                  disabled={
                    isSubmitting ||
                    Object.keys(scores).length !== mockCriteria.length
                  }
                  onClick={handleSubmit}
                  variant="outline"
                >
                  <SaveIcon className="size-4" />
                  Save as Draft
                </Button>
                <Button
                  className="gap-2"
                  disabled={
                    isSubmitting ||
                    Object.keys(scores).length !== mockCriteria.length
                  }
                  onClick={handleSubmit}
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

function AssignmentSidebarItem({
  assignment,
  isSelected,
  onClick,
}: {
  assignment: {
    id: string;
    status: string;
    submissionId: string;
    trackId: string | null;
  };
  isSelected: boolean;
  onClick: () => void;
}) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return { variant: "outline" as const, icon: AlertCircleIcon };
      case "in_progress":
        return { variant: "warning" as const, icon: ClockIcon };
      case "completed":
        return { variant: "success" as const, icon: CheckCircleIcon };
      default:
        return { variant: "default" as const, icon: AlertCircleIcon };
    }
  };
  const config = getStatusConfig(assignment.status);

  return (
    <button
      className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
        isSelected
          ? "border border-primary bg-primary/10 text-primary"
          : "text-foreground hover:bg-muted"
      }`}
      onClick={onClick}
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
        <config.icon className="size-3" />
        {assignment.status}
      </Badge>
    </button>
  );
}

function ScoringCriterion({
  criterion,
  score,
  onChange,
}: {
  criterion: {
    id: string;
    name: string;
    description: string;
    weight: number;
    minScore: number;
    maxScore: number;
  };
  score: number | undefined;
  onChange: (score: number) => void;
}) {
  return (
    <div className="rounded-lg bg-muted/30 p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h4 className="font-medium text-foreground">{criterion.name}</h4>
            <Badge variant="subtle">{criterion.weight}% weight</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {criterion.description}
          </p>
        </div>
        <div className="flex items-center gap-2 font-bold font-display text-lg text-primary">
          {score ?? "—"}
          <span className="text-muted-foreground">/ {criterion.maxScore}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {Array.from(
          { length: criterion.maxScore - criterion.minScore + 1 },
          (_, i) => criterion.minScore + i
        ).map((value) => (
          <button
            className={`flex h-10 w-10 items-center justify-center rounded-lg font-medium text-sm transition-all ${
              score === value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/50"
            }`}
            key={value}
            onClick={() => onChange(value)}
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
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton className="h-12 w-full" key={i} />
              ))}
            </CardContent>
          </Card>
        </aside>
        <div className="space-y-6 lg:col-span-3">
          <Card variant="default">
            <CardContent className="space-y-4 pt-0">
              <Skeleton className="h-24 w-full" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton className="h-20" key={i} />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card variant="default">
            <CardContent className="space-y-6 pt-0">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton className="h-24" key={i} />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { toast } from "sonner";
