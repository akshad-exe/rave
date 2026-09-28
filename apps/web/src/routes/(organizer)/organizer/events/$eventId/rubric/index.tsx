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
import { Checkbox } from "@rave/ui/components/checkbox";
import { Input } from "@rave/ui/components/input";
import { Label } from "@rave/ui/components/label";
import { Progress } from "@rave/ui/components/progress";
import { Separator } from "@rave/ui/components/separator";
import { Skeleton } from "@rave/ui/components/skeleton";
import { Textarea } from "@rave/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  GripVerticalIcon,
  PlusIcon,
  ScaleIcon,
  Trash2Icon,
  XCircleIcon,
} from "lucide-react";
import type * as React from "react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { type client, orpc } from "@/utils/orpc";

// ─── Types ────────────────────────────────────────────────────────────────────

type Track = Awaited<ReturnType<typeof client.tracks.list>>[number];
type RubricRow = Awaited<ReturnType<typeof client.rubrics.listByEvent>>[number];

interface CriterionDraft {
  description: string;
  id: string;
  maxScore: number;
  minScore: number;
  name: string;
  sortOrder: number;
  weight: number;
}

function makeCriterion(sortOrder: number): CriterionDraft {
  return {
    description: "",
    id: `draft_${Date.now()}_${sortOrder}`,
    maxScore: 10,
    minScore: 0,
    name: "",
    sortOrder,
    weight: 0,
  };
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute(
  "/(organizer)/organizer/events/$eventId/rubric/"
)({
  component: RubricEditorPage,
});

// ─── Page ─────────────────────────────────────────────────────────────────────

function RubricEditorPage() {
  const { eventId } = Route.useParams();

  const { data: tracks, status: tracksStatus } = useQuery(
    orpc.tracks.list.queryOptions({ input: { eventId } })
  );

  const { data: existingRubrics, status: rubricsStatus } = useQuery(
    orpc.rubrics.listByEvent.queryOptions({ input: { eventId } })
  );

  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  const handleTrackSelect = useCallback((trackId: string | null) => {
    setSelectedTrackId(trackId);
  }, []);

  const isPending = tracksStatus === "pending" || rubricsStatus === "pending";

  // Find rubric for currently selected track
  const activeRubric = useMemo(() => {
    if (!existingRubrics) {
      return null;
    }
    return existingRubrics.find((r) => r.trackId === selectedTrackId) ?? null;
  }, [existingRubrics, selectedTrackId]);

  if (isPending) {
    return <RubricEditorSkeleton />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            className="mb-2 flex items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
            to="/organizer/events"
          >
            <ArrowLeftIcon className="size-3.5" />
            Back to events
          </Link>
          <h1 className="font-bold font-display text-3xl text-foreground">
            Rubric Editor
          </h1>
          <p className="mt-1 text-muted-foreground">
            Create scoring rubrics for this event. Add one per track, or one
            event-wide rubric.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Track selector sidebar */}
        <aside className="space-y-3 lg:col-span-1">
          <h2 className="font-medium text-foreground text-sm">Scope</h2>

          <TrackButton
            isActive={selectedTrackId === null}
            label="Event-wide"
            onSelect={handleTrackSelect}
            rubricExists={existingRubrics?.some((r) => r.trackId === null)}
            trackId={null}
          />

          {tracks?.map((track) => (
            <TrackButton
              isActive={selectedTrackId === track.id}
              key={track.id}
              label={track.name}
              onSelect={handleTrackSelect}
              rubricExists={existingRubrics?.some(
                (r) => r.trackId === track.id
              )}
              trackId={track.id}
            />
          ))}

          {tracks?.length === 0 && (
            <p className="text-muted-foreground text-xs">
              No tracks defined for this event yet.
            </p>
          )}
        </aside>

        {/* Rubric form */}
        <div className="lg:col-span-3">
          {activeRubric ? (
            <ExistingRubricView
              rubric={activeRubric}
              selectedTrack={
                tracks?.find((t) => t.id === selectedTrackId) ?? null
              }
            />
          ) : (
            <RubricCreateForm
              eventId={eventId}
              selectedTrack={
                tracks?.find((t) => t.id === selectedTrackId) ?? null
              }
              selectedTrackId={selectedTrackId}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Track Button ─────────────────────────────────────────────────────────────

function TrackButton({
  trackId,
  label,
  isActive,
  rubricExists,
  onSelect,
}: {
  isActive: boolean;
  label: string;
  onSelect: (id: string | null) => void;
  rubricExists: boolean | undefined;
  trackId: string | null;
}) {
  const handleClick = useCallback(() => {
    onSelect(trackId);
  }, [trackId, onSelect]);

  return (
    <button
      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
        isActive
          ? "border-primary bg-primary/5 text-primary"
          : "border-border bg-background text-foreground hover:bg-muted/50"
      }`}
      onClick={handleClick}
      type="button"
    >
      <span className="truncate">{label}</span>
      {rubricExists ? (
        <CheckCircleIcon className="ml-2 size-4 shrink-0 text-success" />
      ) : (
        <span className="ml-2 shrink-0 text-muted-foreground text-xs">—</span>
      )}
    </button>
  );
}

// ─── Existing Rubric View ─────────────────────────────────────────────────────

function ExistingRubricView({
  rubric,
  selectedTrack,
}: {
  rubric: RubricRow;
  selectedTrack: Track | null;
}) {
  const { data: rubricDetail, status } = useQuery(
    orpc.rubrics.get.queryOptions({ input: { rubricId: rubric.id } })
  );

  if (status === "pending") {
    return <RubricEditorSkeleton />;
  }

  const scopeLabel = selectedTrack ? selectedTrack.name : "Event-wide";

  return (
    <Card variant="default">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Badge className="mb-2" variant="subtle">
              {scopeLabel}
            </Badge>
            <CardTitle>{rubricDetail?.name ?? rubric.name}</CardTitle>
            {rubricDetail?.description ? (
              <CardDescription className="mt-1">
                {rubricDetail.description}
              </CardDescription>
            ) : null}
          </div>
          <Badge variant={rubric.isWeighted ? "default" : "outline"}>
            {rubric.isWeighted ? "Weighted" : "Unweighted"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Alert
          description={`This rubric has ${rubricDetail?.criteria.length ?? 0} criteria. Editing existing rubrics is not yet supported — create a new one to replace it.`}
          title="Rubric already exists"
          variant="info"
        />

        {rubricDetail?.criteria && rubricDetail.criteria.length > 0 && (
          <div className="mt-4 space-y-3">
            <h3 className="font-medium text-foreground text-sm">Criteria</h3>
            {rubricDetail.criteria.map((c) => (
              <div
                className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3"
                key={c.id}
              >
                <div>
                  <p className="font-medium text-sm">{c.name}</p>
                  {c.description ? (
                    <p className="mt-0.5 text-muted-foreground text-xs">
                      {c.description}
                    </p>
                  ) : null}
                  <p className="mt-1 text-muted-foreground text-xs">
                    Score {c.minScore}–{c.maxScore}
                  </p>
                </div>
                <Badge variant="subtle">{Number(c.weight)}%</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Rubric Create Form ───────────────────────────────────────────────────────

function RubricCreateForm({
  eventId,
  selectedTrackId,
  selectedTrack,
}: {
  eventId: string;
  selectedTrack: Track | null;
  selectedTrackId: string | null;
}) {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isWeighted, setIsWeighted] = useState(true);
  const [criteria, setCriteria] = useState<CriterionDraft[]>([
    makeCriterion(0),
    makeCriterion(1),
    makeCriterion(2),
  ]);

  const createRubric = useMutation(orpc.rubrics.create.mutationOptions());

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setName(e.target.value);
    },
    []
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setDescription(e.target.value);
    },
    []
  );

  const handleWeightedChange = useCallback((checked: boolean) => {
    setIsWeighted(checked);
  }, []);

  // ── Weight helpers ──────────────────────────────────────────────────────────

  const totalWeight = useMemo(
    () => criteria.reduce((sum, c) => sum + (c.weight || 0), 0),
    [criteria]
  );

  const remainingWeight = 100 - totalWeight;
  const isWeightValid = !isWeighted || Math.abs(totalWeight - 100) <= 0.01;

  // ── Criterion mutations ─────────────────────────────────────────────────────

  const addCriterion = useCallback(() => {
    setCriteria((prev) => [...prev, makeCriterion(prev.length)]);
  }, []);

  const removeCriterion = useCallback((id: string) => {
    setCriteria((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      return prev
        .filter((c) => c.id !== id)
        .map((c, i) => ({ ...c, sortOrder: i }));
    });
  }, []);

  const updateCriterion = useCallback(
    (id: string, patch: Partial<CriterionDraft>) => {
      setCriteria((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
      );
    },
    []
  );

  // ── Distribute weight evenly ────────────────────────────────────────────────

  const distributeEvenly = useCallback(() => {
    const each = Number.parseFloat((100 / criteria.length).toFixed(2));
    // Give the last criterion any rounding remainder
    const total = each * (criteria.length - 1);
    const last = Number.parseFloat((100 - total).toFixed(2));
    setCriteria((prev) =>
      prev.map((c, i) => ({
        ...c,
        weight: i === prev.length - 1 ? last : each,
      }))
    );
  }, [criteria.length]);

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      if (!name.trim()) {
        toast.error("Rubric name is required");
        return;
      }

      if (criteria.some((c) => !c.name.trim())) {
        toast.error("All criteria must have a name");
        return;
      }

      if (isWeighted && Math.abs(totalWeight - 100) > 0.01) {
        toast.error(
          `Criterion weights must sum to 100 (currently ${totalWeight.toFixed(2)})`
        );
        return;
      }

      try {
        await createRubric.mutateAsync({
          criteria: criteria.map((c) => ({
            description: c.description || undefined,
            maxScore: c.maxScore,
            minScore: c.minScore,
            name: c.name.trim(),
            sortOrder: c.sortOrder,
            weight: isWeighted
              ? c.weight
              : Number.parseFloat((100 / criteria.length).toFixed(2)),
          })),
          description: description.trim() || undefined,
          eventId,
          isWeighted,
          name: name.trim(),
          trackId: selectedTrackId ?? undefined,
        });

        toast.success("Rubric created");
        queryClient
          .invalidateQueries(
            orpc.rubrics.listByEvent.queryOptions({ input: { eventId } })
          )
          .catch(() => undefined);
        // Reset form
        setName("");
        setDescription("");
        setIsWeighted(true);
        setCriteria([makeCriterion(0), makeCriterion(1), makeCriterion(2)]);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to create rubric";
        toast.error(msg);
      }
    },
    [
      name,
      description,
      isWeighted,
      criteria,
      totalWeight,
      createRubric,
      eventId,
      selectedTrackId,
      queryClient,
    ]
  );

  const scopeLabel = selectedTrack ? selectedTrack.name : "Event-wide";

  return (
    <form onSubmit={handleSubmit}>
      <Card variant="default">
        <CardHeader>
          <Badge className="mb-1 w-fit" variant="subtle">
            {scopeLabel}
          </Badge>
          <CardTitle>New Rubric</CardTitle>
          <CardDescription>
            Define how submissions will be scored
            {selectedTrack
              ? ` in the ${selectedTrack.name} track`
              : " across the event"}
            .
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Name & description */}
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rubric-name">Rubric name</Label>
              <Input
                id="rubric-name"
                maxLength={120}
                onChange={handleNameChange}
                placeholder="e.g. Standard Judging Rubric"
                value={name}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rubric-desc">Description (optional)</Label>
              <Textarea
                id="rubric-desc"
                maxLength={2000}
                onChange={handleDescriptionChange}
                placeholder="Explain what judges should focus on..."
                rows={2}
                value={description}
              />
            </div>
          </div>

          {/* Weighted toggle */}
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-4">
            <Checkbox
              checked={isWeighted}
              id="weighted-toggle"
              onCheckedChange={handleWeightedChange}
            />
            <div>
              <Label className="cursor-pointer" htmlFor="weighted-toggle">
                Weighted scoring
              </Label>
              <p className="mt-0.5 text-muted-foreground text-sm">
                Each criterion contributes a defined percentage to the total.
                Criterion weights must sum to exactly 100.
              </p>
            </div>
          </div>

          <Separator />

          {/* Criteria header */}
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-foreground">
              Criteria
              <span className="ml-2 font-normal text-muted-foreground text-sm">
                ({criteria.length})
              </span>
            </h3>
            {isWeighted ? (
              <Button
                onClick={distributeEvenly}
                size="sm"
                type="button"
                variant="ghost"
              >
                <ScaleIcon className="size-4" />
                Distribute evenly
              </Button>
            ) : null}
          </div>

          {/* Weight progress indicator */}
          {isWeighted ? (
            <WeightIndicator
              isValid={isWeightValid}
              remaining={remainingWeight}
              total={totalWeight}
            />
          ) : null}

          {/* Criteria list */}
          <div className="space-y-4">
            {criteria.map((criterion) => (
              <CriterionRow
                canRemove={criteria.length > 1}
                criterion={criterion}
                isWeighted={isWeighted}
                key={criterion.id}
                onChange={updateCriterion}
                onRemove={removeCriterion}
              />
            ))}
          </div>

          <Button
            className="w-full gap-2"
            onClick={addCriterion}
            type="button"
            variant="outline"
          >
            <PlusIcon className="size-4" />
            Add criterion
          </Button>
        </CardContent>

        <div className="flex items-center justify-between border-border border-t p-4">
          <div className="text-muted-foreground text-sm">
            {isWeighted && !isWeightValid && (
              <span className="flex items-center gap-1.5 text-error">
                <XCircleIcon className="size-4" />
                Weights must sum to 100
              </span>
            )}
            {isWeighted && isWeightValid && totalWeight > 0 && (
              <span className="flex items-center gap-1.5 text-success">
                <CheckCircleIcon className="size-4" />
                Weights sum to 100
              </span>
            )}
          </div>
          <Button
            disabled={
              createRubric.isPending ||
              !name.trim() ||
              (isWeighted && !isWeightValid)
            }
            type="submit"
          >
            {createRubric.isPending ? "Creating…" : "Create Rubric"}
          </Button>
        </div>
      </Card>
    </form>
  );
}

// ─── Weight Indicator ─────────────────────────────────────────────────────────

function WeightIndicator({
  total,
  remaining,
  isValid,
}: {
  isValid: boolean;
  remaining: number;
  total: number;
}) {
  const clamped = Math.min(100, Math.max(0, total));
  const isOver = total > 100;

  // Resolved as a lookup rather than a nested ternary, so the three states read
  // as three named outcomes.
  const totalClassName = (() => {
    if (isOver) {
      return "font-medium text-error";
    }
    if (isValid) {
      return "font-medium text-success";
    }
    return "text-foreground";
  })();

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Weight used</span>
        <span className={totalClassName}>{total.toFixed(0)}% / 100%</span>
      </div>
      <Progress
        className={isOver ? "bg-error/20" : undefined}
        value={clamped}
      />
      {!(isValid || isOver) && remaining > 0 && (
        <p className="text-muted-foreground text-xs">
          {remaining.toFixed(0)}% remaining to assign
        </p>
      )}
      {isOver ? (
        <p className="text-error text-xs">
          {(total - 100).toFixed(0)}% over the limit — reduce some weights
        </p>
      ) : null}
    </div>
  );
}

// ─── Criterion Row ────────────────────────────────────────────────────────────

function CriterionRow({
  criterion,
  isWeighted,
  canRemove,
  onChange,
  onRemove,
}: {
  canRemove: boolean;
  criterion: CriterionDraft;
  isWeighted: boolean;
  onChange: (id: string, patch: Partial<CriterionDraft>) => void;
  onRemove: (id: string) => void;
}) {
  const { id } = criterion;

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange(id, { name: e.target.value }),
    [id, onChange]
  );
  const handleDescChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange(id, { description: e.target.value }),
    [id, onChange]
  );
  const handleWeightChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange(id, { weight: Number.parseFloat(e.target.value) || 0 }),
    [id, onChange]
  );
  const handleMinChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange(id, { minScore: Number.parseInt(e.target.value, 10) || 0 }),
    [id, onChange]
  );
  const handleMaxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange(id, { maxScore: Number.parseInt(e.target.value, 10) || 10 }),
    [id, onChange]
  );
  const handleRemove = useCallback(() => onRemove(id), [id, onRemove]);

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-start gap-3">
        <GripVerticalIcon className="mt-2 size-4 shrink-0 text-muted-foreground/40" />

        <div className="flex-1 space-y-3">
          {/* Name + Weight row */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Label className="mb-1.5 block text-xs" htmlFor={`${id}-name`}>
                Criterion name
              </Label>
              <Input
                id={`${id}-name`}
                maxLength={120}
                onChange={handleNameChange}
                placeholder="e.g. Innovation"
                value={criterion.name}
              />
            </div>
            {isWeighted ? (
              <div>
                <Label
                  className="mb-1.5 block text-xs"
                  htmlFor={`${id}-weight`}
                >
                  Weight (%)
                </Label>
                <Input
                  id={`${id}-weight`}
                  max={100}
                  min={0}
                  onChange={handleWeightChange}
                  placeholder="0"
                  step={0.01}
                  type="number"
                  value={criterion.weight || ""}
                />
              </div>
            ) : null}
          </div>

          {/* Description */}
          <div>
            <Label className="mb-1.5 block text-xs" htmlFor={`${id}-desc`}>
              Description (optional)
            </Label>
            <Input
              id={`${id}-desc`}
              maxLength={500}
              onChange={handleDescChange}
              placeholder="What judges should consider for this criterion"
              value={criterion.description}
            />
          </div>

          {/* Score range */}
          <div className="flex items-center gap-3">
            <div>
              <Label className="mb-1.5 block text-xs" htmlFor={`${id}-min`}>
                Min score
              </Label>
              <Input
                className="w-20"
                id={`${id}-min`}
                min={0}
                onChange={handleMinChange}
                type="number"
                value={criterion.minScore}
              />
            </div>
            <span className="mt-5 text-muted-foreground">–</span>
            <div>
              <Label className="mb-1.5 block text-xs" htmlFor={`${id}-max`}>
                Max score
              </Label>
              <Input
                className="w-20"
                id={`${id}-max`}
                min={1}
                onChange={handleMaxChange}
                type="number"
                value={criterion.maxScore}
              />
            </div>
            <div className="mt-4 text-muted-foreground text-sm">
              ({criterion.maxScore - criterion.minScore} point range)
            </div>
          </div>
        </div>

        {canRemove ? (
          <button
            aria-label={`Remove ${criterion.name || "criterion"}`}
            className="mt-1 rounded p-1 text-muted-foreground transition-colors hover:bg-error/10 hover:text-error"
            onClick={handleRemove}
            type="button"
          >
            <Trash2Icon className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function RubricEditorSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="space-y-3 lg:col-span-1">
          {(["a", "b", "c"] as const).map((k) => (
            <Skeleton className="h-10 w-full" key={k} />
          ))}
        </div>
        <div className="lg:col-span-3">
          <Card variant="default">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              {(["a", "b", "c"] as const).map((k) => (
                <Skeleton className="h-24 w-full" key={k} />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
