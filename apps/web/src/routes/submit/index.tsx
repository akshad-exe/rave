import { Button } from "@rave/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rave/ui/components/card";
import { Input } from "@rave/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rave/ui/components/select";
import { Textarea } from "@rave/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRightIcon, CodeIcon, GlobeIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { FormField } from "@/components/form-field";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/submit/")({
  component: SubmitComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
    return { session: session.data };
  },
});

function SubmitComponent() {
  const navigate = useNavigate({ from: "/dashboard" });
  const { data: myTeam, isLoading: teamLoading } = useQuery(
    orpc.teams.myTeam.queryOptions({ eventId: "" })
  );
  const { data: events } = useQuery(
    orpc.events.list.queryOptions({ status: "submission", limit: 20 })
  );
  const { data: tracks } = useQuery(
    orpc.tracks.list.queryOptions({ eventId: events?.events[0]?.id ?? "" })
  );

  const [activeStep, setActiveStep] = useState(0);
  const steps = ["Basics", "Details", "Media", "Review"];

  const form = useForm({
    defaultValues: {
      eventId: events?.events[0]?.id ?? "",
      teamId: myTeam?.id ?? "",
      trackId: "",
      name: "",
      tagline: "",
      description: "",
      repositoryUrl: "",
      liveDemoUrl: "",
      demoVideoUrl: "",
      thumbnailUrl: "",
      galleryImageUrls: [] as string[],
      techTags: [] as string[],
      customAnswers: [] as Array<{ questionId: string; answer: string }>,
    },
    onSubmit: async ({ value }) => {
      await orpc.submissions.create.mutate(value, {
        onSuccess: (submission) => {
          toast.success("Draft created successfully");
          navigate({ to: `/submissions/${submission.id}` });
        },
        onError: (error) => {
          toast.error(error.message || "Failed to create submission");
        },
      });
    },
    validators: {
      onSubmit: z.object({
        eventId: z.string().min(1, "Select an event"),
        teamId: z.string().optional(),
        trackId: z.string().optional(),
        name: z.string().min(1, "Project name is required").max(120),
        tagline: z.string().max(200).optional(),
        description: z.string().max(20_000).optional(),
        repositoryUrl: z.url("Invalid URL").optional().or(z.literal("")),
        liveDemoUrl: z.url("Invalid URL").optional().or(z.literal("")),
        demoVideoUrl: z.url("Invalid URL").optional().or(z.literal("")),
        thumbnailUrl: z.url("Invalid URL").optional().or(z.literal("")),
        galleryImageUrls: z.array(z.url()).max(10).default([]),
        techTags: z.array(z.string().max(50)).max(20).default([]),
        customAnswers: z
          .array(
            z.object({ questionId: z.string(), answer: z.string().max(5000) })
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

  const currentEvent = events?.events.find(
    (e) => e.id === form.state.values.eventId
  );

  if (teamLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">Loading...</div>
    );
  }

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
        {/* Step 1: Basics */}
        {activeStep === 0 && (
          <Card variant="default">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Start with the essentials</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField
                controls={form.getFieldControls("eventId")}
                label="Hackathon"
              >
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a hackathon" />
                  </SelectTrigger>
                  <SelectContent>
                    {events?.events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                controls={form.getFieldControls("teamId")}
                label="Team"
              >
                <Select>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        myTeam
                          ? myTeam.name
                          : "No team - participate individually"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {myTeam && (
                      <SelectItem value={myTeam.id}>{myTeam.name}</SelectItem>
                    )}
                    {events?.events[0]?.allowIndividuals && (
                      <SelectItem value="">Participate individually</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                controls={form.getFieldControls("trackId")}
                label="Track"
              >
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a track (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {tracks?.map((track) => (
                      <SelectItem key={track.id} value={track.id}>
                        {track.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                controls={form.getFieldControls("name")}
                label="Project Name"
              >
                <Input placeholder="My Awesome Project" />
              </FormField>

              <FormField
                controls={form.getFieldControls("tagline")}
                label="Tagline"
              >
                <Input placeholder="A short, catchy description" />
              </FormField>
            </CardContent>
            <div className="flex justify-end gap-2 border-border border-t p-4">
              <Button
                disabled={activeStep !== 0}
                onClick={() => setActiveStep(1)}
                type="button"
                variant="outline"
              >
                Next
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Details */}
        {activeStep === 1 && (
          <Card variant="default">
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>Tell us more about your project</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField
                asTextarea
                controls={form.getFieldControls("description")}
                label="Description"
              >
                <Textarea
                  placeholder="Describe your project, the problem it solves, and how it works..."
                  rows={6}
                />
              </FormField>

              <FormField
                controls={form.getFieldControls("techTags")}
                label="Tech Stack"
              >
                <div className="flex flex-wrap gap-2">
                  <TechTagInput form={form} />
                </div>
                <p className="text-muted-foreground text-sm">
                  Add technologies, frameworks, and tools used
                </p>
              </FormField>
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

        {/* Step 3: Media */}
        {activeStep === 2 && (
          <Card variant="default">
            <CardHeader>
              <CardTitle>Links & Media</CardTitle>
              <CardDescription>
                Add URLs for your repository, demo, and media
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField
                controls={form.getFieldControls("repositoryUrl")}
                label="Repository URL"
              >
                <Input placeholder="https://github.com/username/repo" />
              </FormField>

              <FormField
                controls={form.getFieldControls("liveDemoUrl")}
                label="Live Demo URL"
              >
                <Input placeholder="https://myproject.vercel.app" />
              </FormField>

              <FormField
                controls={form.getFieldControls("demoVideoUrl")}
                label="Demo Video URL"
              >
                <Input placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..." />
              </FormField>

              <FormField
                controls={form.getFieldControls("thumbnailUrl")}
                label="Thumbnail Image URL"
              >
                <Input placeholder="https://example.com/thumbnail.png" />
              </FormField>

              <FormField
                controls={form.getFieldControls("galleryImageUrls")}
                label="Gallery Images"
              >
                <ImageUrlInput form={form} />
              </FormField>
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
              <CardTitle>Review & Submit</CardTitle>
              <CardDescription>
                Review your submission before creating the draft
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ReviewSection icon={CodeIcon} title="Basic Info">
                <p>
                  <strong>Event:</strong> {currentEvent?.name ?? "Not selected"}
                </p>
                <p>
                  <strong>Team:</strong> {myTeam?.name ?? "Individual"}
                </p>
                <p>
                  <strong>Track:</strong>{" "}
                  {tracks?.find((t) => t.id === form.state.values.trackId)
                    ?.name ?? "Not selected"}
                </p>
                <p>
                  <strong>Name:</strong> {form.state.values.name || "—"}
                </p>
                <p>
                  <strong>Tagline:</strong> {form.state.values.tagline || "—"}
                </p>
              </ReviewSection>

              <ReviewSection icon={CodeIcon} title="Description">
                <p className="whitespace-pre-wrap">
                  {form.state.values.description || "—"}
                </p>
              </ReviewSection>

              <ReviewSection icon={CodeIcon} title="Tech Stack">
                <div className="flex flex-wrap gap-1.5">
                  {form.state.values.techTags.map((tag, i) => (
                    <span
                      className="rounded bg-muted px-2 py-1 text-muted-foreground text-xs"
                      key={i}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </ReviewSection>

              <ReviewSection icon={GlobeIcon} title="Links & Media">
                <p>
                  <strong>Repository:</strong>{" "}
                  {form.state.values.repositoryUrl || "—"}
                </p>
                <p>
                  <strong>Live Demo:</strong>{" "}
                  {form.state.values.liveDemoUrl || "—"}
                </p>
                <p>
                  <strong>Video:</strong>{" "}
                  {form.state.values.demoVideoUrl || "—"}
                </p>
                <p>
                  <strong>Thumbnail:</strong>{" "}
                  {form.state.values.thumbnailUrl || "—"}
                </p>
                <p>
                  <strong>Gallery:</strong>{" "}
                  {form.state.values.galleryImageUrls.length} image(s)
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
                Create Draft
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          </Card>
        )}
      </form>
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

function TechTagInput({ form }: { form: ReturnType<typeof useForm> }) {
  const [inputValue, setInputValue] = useState("");
  const tags = form.state.values.techTags ?? [];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      form.getFieldControls("techTags").onChange([...tags, inputValue.trim()]);
      setInputValue("");
    }
    if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      form.getFieldControls("techTags").onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map((tag, index) => (
        <span
          className="inline-flex items-center gap-1.5 rounded bg-primary/10 px-2 py-1 text-primary text-xs"
          key={index}
        >
          {tag}
          <button
            className="hover:text-error"
            onClick={() =>
              form
                .getFieldControls("techTags")
                .onChange(tags.filter((_, i) => i !== index))
            }
            type="button"
          >
            ×
          </button>
        </span>
      ))}
      <Input
        className="w-auto min-w-[120px]"
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add tech tag..."
        value={inputValue}
      />
    </div>
  );
}

function ImageUrlInput({ form }: { form: ReturnType<typeof useForm> }) {
  const [inputValue, setInputValue] = useState("");
  const urls = form.state.values.galleryImageUrls ?? [];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      form
        .getFieldControls("galleryImageUrls")
        .onChange([...urls, inputValue.trim()]);
      setInputValue("");
    }
    if (e.key === "Backspace" && !inputValue && urls.length > 0) {
      form.getFieldControls("galleryImageUrls").onChange(urls.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {urls.map((url, index) => (
        <span
          className="inline-flex max-w-[200px] items-center gap-1.5 truncate rounded bg-muted px-2 py-1 text-muted-foreground text-xs"
          key={index}
        >
          {url}
          <button
            className="hover:text-error"
            onClick={() =>
              form
                .getFieldControls("galleryImageUrls")
                .onChange(urls.filter((_, i) => i !== index))
            }
            type="button"
          >
            ×
          </button>
        </span>
      ))}
      <Input
        className="w-auto min-w-[200px]"
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add image URL..."
        value={inputValue}
      />
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
