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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rave/ui/components/select";
import { Separator } from "@rave/ui/components/separator";
import { Textarea } from "@rave/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  CalendarIcon,
  ChevronRightIcon,
  GlobeIcon,
  PlusIcon,
  ShieldIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { FormField } from "@/components/form-field";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/(organizer)/organizer/events/new/")({
  component: CreateEventComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
    const profile = await authClient.getProfile();
    if (profile.data?.role !== "organizer" && profile.data?.role !== "admin") {
      throw redirect({ to: "/dashboard" });
    }
  },
});

function CreateEventComponent() {
  const navigate = useNavigate({ from: "/organizer" });
  const [activeStep, setActiveStep] = useState(0);
  const steps = ["Basic Info", "Dates & Rules", "Tracks & Prizes", "Review"];

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
      votingMode: "disabled",
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
      await orpc.events.create.mutate(value, {
        onSuccess: (event) => {
          toast.success("Event created successfully");
          navigate({ to: `/organizer/events/${event.slug}` });
        },
        onError: (error) => {
          toast.error(error.message || "Failed to create event");
        },
      });
    },
    validators: {
      onSubmit: z.object({
        name: z.string().min(3, "Name must be at least 3 characters").max(120),
        slug: z
          .string()
          .min(3)
          .max(80)
          .regex(
            /^[a-z0-9-]+$/,
            "Slug must be lowercase alphanumeric with dashes"
          ),
        tagline: z.string().max(200).optional(),
        description: z.string().max(10_000).optional(),
        coverImageUrl: z.url("Invalid URL").optional().or(z.literal("")),
        websiteUrl: z.url("Invalid URL").optional().or(z.literal("")),
        isPublic: z.boolean(),
        allowIndividuals: z.boolean(),
        maxTeamSize: z.number().int().min(1).max(20),
        minTeamSize: z.number().int().min(1),
        maxVotesPerUser: z.number().int().min(1).max(50),
        votingMode: z.enum(["disabled", "open", "authenticated"]),
        registrationStartAt: z.string().optional(),
        registrationEndAt: z.string().optional(),
        submissionStartAt: z.string().optional(),
        submissionDeadline: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        judgingStartAt: z.string().optional(),
        judgingEndAt: z.string().optional(),
        customQuestions: z
          .array(
            z.object({
              id: z.string(),
              label: z.string().max(200),
              type: z.enum(["text", "url", "textarea"]),
              required: z.boolean(),
            })
          )
          .default([]),
      }),
    },
  });

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      event.stopPropagation();
      form.handleSubmit();
    },
    [form]
  );

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div className="flex items-center" key={step}>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full font-medium text-sm transition-colors ${
                  index < activeStep
                    ? "bg-primary text-primary-foreground"
                    : index === activeStep
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                }
                `}
              >
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
                controls={form.getFieldControls("name")}
                label="Event Name"
              >
                <Input placeholder="Sample Hack 2026" />
              </FormField>

              <FormField
                controls={form.getFieldControls("slug")}
                label="Slug (URL)"
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">rave.dev/</span>
                  <Input
                    onBlur={(e) => {
                      if (!form.state.values.slug && form.state.values.name) {
                        form
                          .getFieldControls("slug")
                          .onChange(slugify(e.target.value));
                      }
                    }}
                    placeholder="sample-hack-2026"
                  />
                </div>
              </FormField>

              <FormField
                controls={form.getFieldControls("tagline")}
                label="Tagline"
              >
                <Input placeholder="A short, catchy description" />
              </FormField>

              <FormField
                asTextarea
                controls={form.getFieldControls("description")}
                label="Description"
              >
                <Textarea
                  placeholder="Describe your hackathon, its goals, and what participants can expect..."
                  rows={5}
                />
              </FormField>

              <Separator className="my-4" />

              <FormField
                controls={form.getFieldControls("coverImageUrl")}
                label="Cover Image URL"
              >
                <Input placeholder="https://example.com/cover.jpg" />
              </FormField>

              <FormField
                controls={form.getFieldControls("websiteUrl")}
                label="Website URL"
              >
                <Input placeholder="https://your-event.com" />
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  controls={form.getFieldControls("isPublic")}
                  label="Public Event"
                >
                  <div className="flex items-center gap-2">
                    <Checkbox />
                    <Label>List publicly on the platform</Label>
                  </div>
                </FormField>

                <FormField
                  controls={form.getFieldControls("allowIndividuals")}
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
              <Button onClick={() => setActiveStep(1)} type="button">
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
                  controls={form.getFieldControls("registrationStartAt")}
                  label="Registration Opens"
                >
                  <Input type="datetime-local" />
                </FormField>
                <FormField
                  controls={form.getFieldControls("registrationEndAt")}
                  label="Registration Closes"
                >
                  <Input type="datetime-local" />
                </FormField>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  controls={form.getFieldControls("submissionStartAt")}
                  label="Submissions Open"
                >
                  <Input type="datetime-local" />
                </FormField>
                <FormField
                  controls={form.getFieldControls("submissionDeadline")}
                  label="Submission Deadline"
                >
                  <Input type="datetime-local" />
                </FormField>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  controls={form.getFieldControls("startDate")}
                  label="Event Starts"
                >
                  <Input type="datetime-local" />
                </FormField>
                <FormField
                  controls={form.getFieldControls("endDate")}
                  label="Event Ends"
                >
                  <Input type="datetime-local" />
                </FormField>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  controls={form.getFieldControls("judgingStartAt")}
                  label="Judging Starts"
                >
                  <Input type="datetime-local" />
                </FormField>
                <FormField
                  controls={form.getFieldControls("judgingEndAt")}
                  label="Judging Ends"
                >
                  <Input type="datetime-local" />
                </FormField>
              </div>

              <Separator className="my-4" />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  controls={form.getFieldControls("minTeamSize")}
                  label="Min Team Size"
                >
                  <Input max="20" min="1" type="number" />
                </FormField>
                <FormField
                  controls={form.getFieldControls("maxTeamSize")}
                  label="Max Team Size"
                >
                  <Input max="20" min="1" type="number" />
                </FormField>
              </div>

              <FormField
                controls={form.getFieldControls("maxVotesPerUser")}
                label="Max Votes Per User"
              >
                <Input max="50" min="1" type="number" />
              </FormField>

              <FormField
                controls={form.getFieldControls("votingMode")}
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
                onClick={() => setActiveStep(0)}
                type="button"
                variant="outline"
              >
                Back
              </Button>
              <Button onClick={() => setActiveStep(2)} type="button">
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
              <Button onClick={() => addTrack()} size="sm" variant="outline">
                <PlusIcon className="size-4" />
                Add Track
              </Button>
            </CardHeader>
            <CardContent>
              <TracksForm form={form} />
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
                onClick={() => setActiveStep(1)}
                type="button"
                variant="outline"
              >
                Back
              </Button>
              <Button onClick={() => setActiveStep(3)} type="button">
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
                onClick={() => setActiveStep(2)}
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

function CustomQuestions({ form }: { form: ReturnType<typeof useForm> }) {
  const [questions, setQuestions] = useState(
    form.state.values.customQuestions ?? []
  );

  const addQuestion = () => {
    const newQuestion = {
      id: `q_${Date.now()}`,
      label: "",
      type: "text" as const,
      required: false,
    };
    setQuestions([...questions, newQuestion]);
    form
      .getFieldControls("customQuestions")
      .onChange([...questions, newQuestion]);
  };

  const removeQuestion = (id: string) => {
    const updated = questions.filter((q) => q.id !== id);
    setQuestions(updated);
    form.getFieldControls("customQuestions").onChange(updated);
  };

  const updateQuestion = (
    id: string,
    field: string,
    value: string | boolean
  ) => {
    const updated = questions.map((q) =>
      q.id === id ? { ...q, [field]: value } : q
    );
    setQuestions(updated);
    form.getFieldControls("customQuestions").onChange(updated);
  };

  return (
    <div className="space-y-4">
      {questions.map((question) => (
        <Card
          className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
          key={question.id}
          variant="borderless"
        >
          <div className="flex-1 space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <Input
                onChange={(e) =>
                  updateQuestion(question.id, "label", e.target.value)
                }
                placeholder="Question label"
                value={question.label}
              />
              <Select
                onValueChange={(v) => updateQuestion(question.id, "type", v)}
                value={question.type}
              >
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
                  onCheckedChange={(checked) =>
                    updateQuestion(question.id, "required", checked)
                  }
                />
                <Label>Required</Label>
              </div>
            </div>
          </div>
          <Button
            className="text-error hover:text-error"
            onClick={() => removeQuestion(question.id)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <XIcon className="size-4" />
          </Button>
        </Card>
      ))}
      {questions.length === 0 && (
        <div className="py-8 text-center text-muted-foreground">
          <p>No custom questions yet</p>
        </div>
      )}
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

function TracksForm({ form }: { form: ReturnType<typeof useForm> }) {
  const [tracks, setTracks] = useState([
    { id: `t_${Date.now()}`, name: "", description: "", sortOrder: 0 },
  ]);

  const addTrack = () => {
    setTracks([
      ...tracks,
      {
        id: `t_${Date.now()}`,
        name: "",
        description: "",
        sortOrder: tracks.length,
      },
    ]);
  };

  const removeTrack = (id: string) => {
    if (tracks.length <= 1) {
      return;
    }
    setTracks(tracks.filter((t) => t.id !== id));
  };

  const updateTrack = (id: string, field: string, value: string) => {
    setTracks(tracks.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

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
                onChange={(e) => updateTrack(track.id, "name", e.target.value)}
                placeholder="Track name (e.g., Developer Tools)"
                value={track.name}
              />
              <Input
                onChange={(e) =>
                  updateTrack(track.id, "description", e.target.value)
                }
                placeholder="Description (optional)"
                value={track.description}
              />
              <Input
                className="w-24"
                onChange={(e) =>
                  updateTrack(track.id, "sortOrder", e.target.value)
                }
                placeholder="Sort order"
                type="number"
                value={track.sortOrder}
              />
            </div>
          </div>
          {tracks.length > 1 && (
            <Button
              className="text-error hover:text-error"
              onClick={() => removeTrack(track.id)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <XIcon className="size-4" />
            </Button>
          )}
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

import { redirect } from "@tanstack/react-router";
