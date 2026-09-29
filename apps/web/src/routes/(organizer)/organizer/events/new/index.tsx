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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rave/ui/components/select";
import { Separator } from "@rave/ui/components/separator";
import { Textarea } from "@rave/ui/components/textarea";
import type { AnyFormApi } from "@tanstack/react-form";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import {
  CalendarIcon,
  ChevronRightIcon,
  GlobeIcon,
  PlusIcon,
  ShieldIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import type * as React from "react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { FormField, fieldControls } from "@/components/form-field";
import { sessionQueryOptions } from "@/lib/session";
import { client, orpc } from "@/utils/orpc";

/** Slug rules live at module scope so the regex is not rebuilt on every render. */
const SLUG_PATTERN = /^[a-z0-9-]+$/;
const SLUG_NON_ALNUM = /[^a-z0-9]+/g;
const SLUG_EDGES = /^-+|-+$/g;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(SLUG_NON_ALNUM, "-")
    .replace(SLUG_EDGES, "");
}

function getStepCircleClass(index: number, activeStep: number): string {
  const base =
    "flex h-10 w-10 items-center justify-center rounded-full font-medium text-sm transition-colors";
  if (index < activeStep) {
    return `${base} bg-primary text-primary-foreground`;
  }
  return index === activeStep
    ? `${base} bg-primary/10 text-primary`
    : `${base} bg-muted text-muted-foreground`;
}

interface TrackDraft {
  description: string;
  id: string;
  name: string;
  sortOrder: number;
}

function createTrack(sortOrder: number): TrackDraft {
  return { description: "", id: `t_${Date.now()}`, name: "", sortOrder };
}

/**
 * Kept at module scope so the component body stays within the complexity budget,
 * and typed against the same shape the form's `defaultValues` produce.
 */
type EventVotingMode = "disabled" | "open" | "authenticated";

const eventFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(120),
  slug: z
    .string()
    .min(3)
    .max(80)
    .regex(SLUG_PATTERN, "Slug must be lowercase alphanumeric with dashes"),
  tagline: z.string().max(200),
  description: z.string().max(10_000),
  coverImageUrl: z.url("Invalid URL").or(z.literal("")),
  websiteUrl: z.url("Invalid URL").or(z.literal("")),
  isPublic: z.boolean(),
  allowIndividuals: z.boolean(),
  maxTeamSize: z.number().int().min(1).max(20),
  minTeamSize: z.number().int().min(1),
  maxVotesPerUser: z.number().int().min(1).max(50),
  votingMode: z.enum(["disabled", "open", "authenticated"]),
  registrationStartAt: z.string(),
  registrationEndAt: z.string(),
  submissionStartAt: z.string(),
  submissionDeadline: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  judgingStartAt: z.string(),
  judgingEndAt: z.string(),
  customQuestions: z.array(
    z.object({
      id: z.string(),
      label: z.string().max(200),
      type: z.enum(["text", "url", "textarea"]),
      required: z.boolean(),
    })
  ),
});

export const Route = createFileRoute("/(organizer)/organizer/events/new/")({
  component: CreateEventComponent,
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(
      sessionQueryOptions()
    );
    if (!user) {
      throw redirect({ to: "/login" });
    }
    const me = await client.me();
    if (me.role !== "organizer" && me.role !== "admin") {
      throw redirect({ to: "/dashboard" });
    }
  },
});

function CreateEventComponent() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const steps = ["Basic Info", "Dates & Rules", "Tracks & Prizes", "Review"];

  const createEvent = useMutation(orpc.events.create.mutationOptions());

  const form = useForm({
    defaultValues: {
      name: "",
      slug: "",
      tagline: "",
      description: "",
      coverImageUrl: "",
      websiteUrl: "",
      isPublic: true,
      allowIndividuals: true,
      maxTeamSize: 4,
      minTeamSize: 1,
      maxVotesPerUser: 3,
      votingMode: "disabled" as EventVotingMode,
      registrationStartAt: "",
      registrationEndAt: "",
      submissionStartAt: "",
      submissionDeadline: "",
      startDate: "",
      endDate: "",
      judgingStartAt: "",
      judgingEndAt: "",
      customQuestions: [] as Array<{
        id: string;
        label: string;
        type: "text" | "url" | "textarea";
        required: boolean;
      }>,
    },
    onSubmit: async ({ value }) => {
      try {
        await createEvent.mutateAsync(value);
        toast.success("Event created successfully");
        // No `/organizer/events/$slug` route exists yet, so land on the list.
        navigate({ to: "/organizer/events" });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create event"
        );
      }
    },
    // The form always supplies a string for every optional-looking field
    // (its defaults are ""), so the schema input must be `string`, not
    // `string | undefined` — Standard Schema's input type has to match the
    // form data exactly or `useForm` rejects the validator.
    validators: {
      onSubmit: eventFormSchema,
    },
  });

  const [tracks, setTracks] = useState<TrackDraft[]>(() => [createTrack(0)]);

  const addTrack = useCallback(() => {
    setTracks((prev) => [...prev, createTrack(prev.length)]);
  }, []);

  const removeTrack = useCallback((id: string) => {
    setTracks((prev) =>
      prev.length <= 1 ? prev : prev.filter((t) => t.id !== id)
    );
  }, []);

  const updateTrack = useCallback(
    (id: string, field: string, value: string) => {
      setTracks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
      );
    },
    []
  );

  const handleSlugBlur = useCallback(
    (event: React.FocusEvent<HTMLInputElement>) => {
      if (!form.state.values.slug && form.state.values.name) {
        fieldControls(form, "slug").onChange(slugify(event.target.value));
      }
    },
    [form]
  );

  const handleStepClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const { step } = event.currentTarget.dataset;
      if (step) {
        setActiveStep(Number(step));
      }
    },
    []
  );

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      event.stopPropagation();
      form.handleSubmit();
    },
    [form]
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div className="flex items-center" key={step}>
              <div className={getStepCircleClass(index, activeStep)}>
                {index < activeStep ? (
                  <ChevronRightIcon className="size-5" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`ml-2 hidden font-medium text-sm sm:block ${index <= activeStep ? "text-foreground" : "text-muted-foreground"}
              `}
              >
                {step}
              </span>
              {index < steps.length - 1 && (
                <div
                  className={`ml-2 hidden h-0.5 w-16 lg:block ${index < activeStep ? "bg-primary" : "bg-border"}
                  `}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* Step 1: Basic Info */}
        {activeStep === 0 && (
          <Card variant="default">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Set up the identity of your hackathon
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField
                controls={fieldControls(form, "name")}
                label="Event Name"
              >
                <Input placeholder="Sample Hack 2026" />
              </FormField>

              <FormField
                controls={fieldControls(form, "slug")}
                label="Slug (URL)"
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">rave.dev/</span>
                  <Input
                    onBlur={handleSlugBlur}
                    placeholder="sample-hack-2026"
                  />
                </div>
              </FormField>

              <FormField
                controls={fieldControls(form, "tagline")}
                label="Tagline"
              >
                <Input placeholder="A short, catchy description" />
              </FormField>

              <FormField
                asTextarea
                controls={fieldControls(form, "description")}
                label="Description"
              >
                <Textarea
                  placeholder="Describe your hackathon, its goals, and what participants can expect..."
                  rows={5}
                />
              </FormField>

              <Separator className="my-4" />

              <FormField
                controls={fieldControls(form, "coverImageUrl")}
                label="Cover Image URL"
              >
                <Input placeholder="https://example.com/cover.jpg" />
              </FormField>

              <FormField
                controls={fieldControls(form, "websiteUrl")}
                label="Website URL"
              >
                <Input placeholder="https://your-event.com" />
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  controls={fieldControls(form, "isPublic")}
                  label="Public Event"
                >
                  <div className="flex items-center gap-2">
                    <Checkbox />
                    <Label>List publicly on the platform</Label>
                  </div>
                </FormField>

                <FormField
                  controls={fieldControls(form, "allowIndividuals")}
                  label="Allow Individuals"
                >
                  <div className="flex items-center gap-2">
                    <Checkbox />
                    <Label>Allow solo participation</Label>
                  </div>
                </FormField>
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 border-border border-t p-4">
              <Button data-step={1} onClick={handleStepClick} type="button">
                Next
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Dates & Rules */}
        {activeStep === 1 && (
          <Card variant="default">
            <CardHeader>
              <CardTitle>Dates & Rules</CardTitle>
              <CardDescription>
                Configure the timeline and participation rules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  controls={fieldControls(form, "registrationStartAt")}
                  label="Registration Opens"
                >
                  <Input type="datetime-local" />
                </FormField>
                <FormField
                  controls={fieldControls(form, "registrationEndAt")}
                  label="Registration Closes"
                >
                  <Input type="datetime-local" />
                </FormField>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  controls={fieldControls(form, "submissionStartAt")}
                  label="Submissions Open"
                >
                  <Input type="datetime-local" />
                </FormField>
                <FormField
                  controls={fieldControls(form, "submissionDeadline")}
                  label="Submission Deadline"
                >
                  <Input type="datetime-local" />
                </FormField>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  controls={fieldControls(form, "startDate")}
                  label="Event Starts"
                >
                  <Input type="datetime-local" />
                </FormField>
                <FormField
                  controls={fieldControls(form, "endDate")}
                  label="Event Ends"
                >
                  <Input type="datetime-local" />
                </FormField>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  controls={fieldControls(form, "judgingStartAt")}
                  label="Judging Starts"
                >
                  <Input type="datetime-local" />
                </FormField>
                <FormField
                  controls={fieldControls(form, "judgingEndAt")}
                  label="Judging Ends"
                >
                  <Input type="datetime-local" />
                </FormField>
              </div>

              <Separator className="my-4" />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  controls={fieldControls(form, "minTeamSize")}
                  label="Min Team Size"
                >
                  <Input max="20" min="1" type="number" />
                </FormField>
                <FormField
                  controls={fieldControls(form, "maxTeamSize")}
                  label="Max Team Size"
                >
                  <Input max="20" min="1" type="number" />
                </FormField>
              </div>

              <FormField
                controls={fieldControls(form, "maxVotesPerUser")}
                label="Max Votes Per User"
              >
                <Input max="50" min="1" type="number" />
              </FormField>

              <FormField
                controls={fieldControls(form, "votingMode")}
                label="Voting Mode"
              >
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select voting mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disabled">Disabled</SelectItem>
                    <SelectItem value="open">Open (anyone can vote)</SelectItem>
                    <SelectItem value="authenticated">
                      Authenticated users only
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <Separator className="my-4" />

              <h4 className="font-medium">Custom Questions</h4>
              <CustomQuestions form={form} />
            </CardContent>
            <div className="flex justify-between border-border border-t p-4">
              <Button
                data-step={0}
                onClick={handleStepClick}
                type="button"
                variant="outline"
              >
                Back
              </Button>
              <Button data-step={2} onClick={handleStepClick} type="button">
                Next
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Tracks & Prizes */}
        {activeStep === 2 && (
          <Card variant="default">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tracks & Prizes</CardTitle>
                <CardDescription>
                  Define competition categories and awards
                </CardDescription>
              </div>
              <Button
                onClick={addTrack}
                size="sm"
                type="button"
                variant="outline"
              >
                <PlusIcon className="size-4" />
                Add Track
              </Button>
            </CardHeader>
            <CardContent>
              <TracksForm
                onRemove={removeTrack}
                onUpdate={updateTrack}
                tracks={tracks}
              />
              <Separator className="my-4" />
              <div className="flex justify-between">
                <h4 className="font-medium">Prizes</h4>
                <Button size="sm" variant="outline">
                  <PlusIcon className="size-4" />
                  Add Prize
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                <p className="text-muted-foreground text-sm">
                  Prize management will be available after event creation.
                </p>
              </div>
            </CardContent>
            <div className="flex justify-between border-border border-t p-4">
              <Button
                data-step={1}
                onClick={handleStepClick}
                type="button"
                variant="outline"
              >
                Back
              </Button>
              <Button data-step={3} onClick={handleStepClick} type="button">
                Next
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 4: Review */}
        {activeStep === 3 && (
          <Card variant="default">
            <CardHeader>
              <CardTitle>Review & Create</CardTitle>
              <CardDescription>
                Review all details before creating your event
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ReviewSection icon={GlobeIcon} title="Basic Info">
                <p>
                  <strong>Name:</strong> {form.state.values.name || "—"}
                </p>
                <p>
                  <strong>Slug:</strong> {form.state.values.slug || "—"}
                </p>
                <p>
                  <strong>Tagline:</strong> {form.state.values.tagline || "—"}
                </p>
                <p>
                  <strong>Public:</strong>{" "}
                  {form.state.values.isPublic ? "Yes" : "No"}
                </p>
                <p>
                  <strong>Allow Individuals:</strong>{" "}
                  {form.state.values.allowIndividuals ? "Yes" : "No"}
                </p>
              </ReviewSection>

              <ReviewSection icon={CalendarIcon} title="Timeline">
                <p>
                  <strong>Registration:</strong>{" "}
                  {form.state.values.registrationStartAt || "Not set"} –{" "}
                  {form.state.values.registrationEndAt || "Not set"}
                </p>
                <p>
                  <strong>Submissions:</strong>{" "}
                  {form.state.values.submissionStartAt || "Not set"} –{" "}
                  {form.state.values.submissionDeadline || "Not set"}
                </p>
                <p>
                  <strong>Event:</strong>{" "}
                  {form.state.values.startDate || "Not set"} –{" "}
                  {form.state.values.endDate || "Not set"}
                </p>
                <p>
                  <strong>Judging:</strong>{" "}
                  {form.state.values.judgingStartAt || "Not set"} –{" "}
                  {form.state.values.judgingEndAt || "Not set"}
                </p>
              </ReviewSection>

              <ReviewSection icon={ShieldIcon} title="Rules">
                <p>
                  <strong>Team Size:</strong> {form.state.values.minTeamSize} –{" "}
                  {form.state.values.maxTeamSize}
                </p>
                <p>
                  <strong>Voting:</strong> {form.state.values.votingMode}
                </p>
                <p>
                  <strong>Max Votes:</strong>{" "}
                  {form.state.values.maxVotesPerUser}
                </p>
                <p>
                  <strong>Custom Questions:</strong>{" "}
                  {form.state.values.customQuestions.length}
                </p>
              </ReviewSection>

              <ReviewSection icon={UsersIcon} title="Tracks">
                <p className="text-muted-foreground text-sm">
                  Track management available after creation.
                </p>
              </ReviewSection>
            </CardContent>
            <div className="flex justify-end gap-2 border-border border-t p-4">
              <Button
                data-step={2}
                onClick={handleStepClick}
                type="button"
                variant="outline"
              >
                Back
              </Button>
              <Button className="gap-2" type="submit">
                Create Event
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          </Card>
        )}
      </form>
    </div>
  );
}

interface QuestionDraft {
  id: string;
  label: string;
  required: boolean;
  type: "text" | "url" | "textarea";
}

function CustomQuestions({ form }: { form: AnyFormApi }) {
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    (form.state.values.customQuestions as QuestionDraft[] | undefined) ?? []
  );

  const commit = useCallback(
    (next: QuestionDraft[]) => {
      setQuestions(next);
      form.setFieldValue("customQuestions", next);
    },
    [form]
  );

  const addQuestion = useCallback(() => {
    commit([
      ...questions,
      { id: `q_${Date.now()}`, label: "", required: false, type: "text" },
    ]);
  }, [commit, questions]);

  const removeQuestion = useCallback(
    (id: string) => {
      commit(questions.filter((q) => q.id !== id));
    },
    [commit, questions]
  );

  const updateQuestion = useCallback(
    (id: string, field: string, value: string | boolean) => {
      commit(
        questions.map((q) => (q.id === id ? { ...q, [field]: value } : q))
      );
    },
    [commit, questions]
  );

  return (
    <div className="space-y-4">
      {questions.map((question) => (
        <QuestionRow
          key={question.id}
          onRemove={removeQuestion}
          onUpdate={updateQuestion}
          question={question}
        />
      ))}
      {questions.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          <p>No custom questions yet</p>
        </div>
      ) : null}
      <Button
        className="w-full sm:w-auto"
        onClick={addQuestion}
        type="button"
        variant="outline"
      >
        <PlusIcon className="size-4" />
        Add Question
      </Button>
    </div>
  );
}

function QuestionRow({
  question,
  onRemove,
  onUpdate,
}: {
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: string, value: string | boolean) => void;
  question: QuestionDraft;
}) {
  const { id } = question;

  const handleLabelChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate(id, "label", event.target.value);
    },
    [id, onUpdate]
  );

  const handleTypeChange = useCallback(
    (value: string | null) => {
      onUpdate(id, "type", value ?? "text");
    },
    [id, onUpdate]
  );

  const handleRequiredChange = useCallback(
    (checked: boolean) => {
      onUpdate(id, "required", checked);
    },
    [id, onUpdate]
  );

  const handleRemove = useCallback(() => {
    onRemove(id);
  }, [id, onRemove]);

  return (
    <Card
      className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
      variant="borderless"
    >
      <div className="flex-1 space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <Input
            onChange={handleLabelChange}
            placeholder="Question label"
            value={question.label}
          />
          <Select onValueChange={handleTypeChange} value={question.type}>
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Short Text</SelectItem>
              <SelectItem value="url">URL</SelectItem>
              <SelectItem value="textarea">Long Text</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={question.required}
              onCheckedChange={handleRequiredChange}
            />
            <Label>Required</Label>
          </div>
        </div>
      </div>
      <Button
        className="text-error hover:text-error"
        onClick={handleRemove}
        size="icon"
        type="button"
        variant="ghost"
      >
        <XIcon className="size-4" />
      </Button>
    </Card>
  );
}

function TracksForm({
  tracks,
  onRemove,
  onUpdate,
}: {
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: string, value: string) => void;
  tracks: TrackDraft[];
}) {
  const handleFieldChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { field, trackId } = event.currentTarget.dataset;
      if (field && trackId) {
        onUpdate(trackId, field, event.target.value);
      }
    },
    [onUpdate]
  );

  const handleRemoveClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const { trackId } = event.currentTarget.dataset;
      if (trackId) {
        onRemove(trackId);
      }
    },
    [onRemove]
  );

  return (
    <div className="space-y-4">
      {tracks.map((track) => (
        <Card
          className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
          key={track.id}
          variant="borderless"
        >
          <div className="flex-1 space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <Input
                data-field="name"
                data-track-id={track.id}
                onChange={handleFieldChange}
                placeholder="Track name (e.g., Developer Tools)"
                value={track.name}
              />
              <Input
                data-field="description"
                data-track-id={track.id}
                onChange={handleFieldChange}
                placeholder="Description (optional)"
                value={track.description}
              />
              <Input
                className="w-24"
                data-field="sortOrder"
                data-track-id={track.id}
                onChange={handleFieldChange}
                placeholder="Sort order"
                type="number"
                value={track.sortOrder}
              />
            </div>
          </div>
          {tracks.length > 1 ? (
            <Button
              className="text-error hover:text-error"
              data-track-id={track.id}
              onClick={handleRemoveClick}
              size="icon"
              type="button"
              variant="ghost"
            >
              <XIcon className="size-4" />
            </Button>
          ) : null}
        </Card>
      ))}
    </div>
  );
}

function ReviewSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-muted/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-5 text-primary" />
        <h4 className="font-medium text-foreground">{title}</h4>
      </div>
      <div>{children}</div>
    </div>
  );
}
