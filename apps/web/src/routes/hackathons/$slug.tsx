import { Alert } from "@rave/ui/components/alert";
import { Badge } from "@rave/ui/components/badge";
import { Button } from "@rave/ui/components/button";
import { Card } from "@rave/ui/components/card";
import { Skeleton } from "@rave/ui/components/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@rave/ui/components/tabs";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  CalendarIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  CodeIcon,
  GlobeIcon,
  ShieldIcon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react";
import { formatDate, formatDateTime, getEventStatusConfig } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/hackathons/$slug")({
  component: HackathonDetailComponent,
  validateSearch: (search) => ({
    tab: search.tab || "overview",
  }),
});

function HackathonDetailComponent() {
  const { slug } = useParams({ from: "/hackathons/$slug", strict: true });
  const {
    data: event,
    isLoading,
    isError,
  } = useQuery(orpc.events.getBySlug.queryOptions({ slug }));

  if (isLoading) {
    return <HackathonDetailSkeleton />;
  }

  if (isError || !event) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <Alert
          description="The hackathon you're looking for doesn't exist or has been removed."
          title="Hackathon not found"
          variant="destructive"
        />
        <Link className="mt-4 inline-block" to="/hackathons">
          <Button variant="outline">Back to Hackathons</Button>
        </Link>
      </div>
    );
  }

  const statusConfig = getEventStatusConfig(event.status);
  const isRegistrationOpen =
    event.registrationStartAt && event.registrationEndAt
      ? new Date(event.registrationStartAt) <= new Date() &&
        new Date(event.registrationEndAt) >= new Date()
      : false;
  const isSubmissionOpen =
    event.submissionStartAt && event.submissionDeadline
      ? new Date(event.submissionStartAt) <= new Date() &&
        new Date(event.submissionDeadline) >= new Date()
      : false;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <Badge className="text-sm" variant={statusConfig.variant}>
                {statusConfig.label}
              </Badge>
              {event.isPublic && (
                <Badge className="text-xs" variant="outline">
                  Public
                </Badge>
              )}
            </div>
            <h1 className="font-bold font-display text-3xl text-foreground sm:text-4xl">
              {event.name}
            </h1>
            {event.tagline && (
              <p className="mt-2 text-lg text-muted-foreground">
                {event.tagline}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {isRegistrationOpen && (
              <Button className="gap-2" size="lg">
                <UsersIcon className="size-4" />
                Register
              </Button>
            )}
            {isSubmissionOpen && (
              <Button className="gap-2" size="lg" variant="outline">
                <CodeIcon className="size-4" />
                Submit Project
              </Button>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/30 p-4 md:grid-cols-4">
          <MetaItem
            icon={CalendarIcon}
            label="Event Dates"
            value={`${event.startDate ? formatDate(event.startDate) : "TBD"} – ${event.endDate ? formatDate(event.endDate) : "TBD"}`}
          />
          <MetaItem
            icon={ClockIcon}
            label="Registration"
            value={
              event.registrationEndAt
                ? `Ends ${formatRelativeTime(event.registrationEndAt)}`
                : "N/A"
            }
          />
          <MetaItem
            icon={ClockIcon}
            label="Submission Deadline"
            value={
              event.submissionDeadline
                ? `Ends ${formatRelativeTime(event.submissionDeadline)}`
                : "N/A"
            }
          />
          <MetaItem
            icon={UsersIcon}
            label="Team Size"
            value={`${event.minTeamSize} – ${event.maxTeamSize} members`}
          />
        </div>
      </div>

      {/* Cover Image */}
      {event.coverImageUrl && (
        <div className="mb-8 aspect-video w-full overflow-hidden rounded-lg">
          <img
            alt=""
            className="h-full w-full object-cover"
            src={event.coverImageUrl}
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs className="w-full" defaultIndex={0}>
        <TabsList className="w-full">
          <TabsTrigger index={0}>Overview</TabsTrigger>
          <TabsTrigger index={1}>Timeline</TabsTrigger>
          <TabsTrigger index={2}>Tracks & Prizes</TabsTrigger>
          <TabsTrigger index={3}>Rules</TabsTrigger>
          <TabsTrigger index={4}>FAQ</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-6" index={0}>
          <OverviewTab event={event} />
        </TabsContent>

        <TabsContent className="mt-6" index={1}>
          <TimelineTab event={event} />
        </TabsContent>

        <TabsContent className="mt-6" index={2}>
          <TracksPrizesTab eventId={event.id} />
        </TabsContent>

        <TabsContent className="mt-6" index={3}>
          <RulesTab event={event} />
        </TabsContent>

        <TabsContent className="mt-6" index={4}>
          <FAQTab event={event} />
        </TabsContent>
      </Tabs>
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

function OverviewTab({ event }: { event: any }) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 font-display font-semibold text-foreground text-xl">
          About
        </h2>
        <div className="prose prose-muted max-w-none">
          {event.description ? (
            <p className="whitespace-pre-wrap text-muted-foreground">
              {event.description}
            </p>
          ) : (
            <p className="text-muted-foreground">No description provided.</p>
          )}
        </div>
      </section>

      {event.websiteUrl && (
        <section>
          <h2 className="mb-4 font-display font-semibold text-foreground text-xl">
            Links
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              rel="noopener noreferrer"
              target="_blank"
              to={event.websiteUrl}
            >
              <Button className="gap-2" variant="outline">
                <GlobeIcon className="size-4" />
                Website
              </Button>
            </Link>
          </div>
        </section>
      )}

      {event.customQuestions && event.customQuestions.length > 0 && (
        <section>
          <h2 className="mb-4 font-display font-semibold text-foreground text-xl">
            Custom Questions
          </h2>
          <div className="space-y-3">
            {event.customQuestions.map((q: any, i: number) => (
              <div className="rounded-lg bg-muted/30 p-4" key={i}>
                <p className="font-medium">{q.label}</p>
                <p className="text-muted-foreground text-sm capitalize">
                  {q.type}
                </p>
                {q.required && (
                  <span className="text-error text-xs">Required</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TimelineTab({ event }: { event: any }) {
  const timeline = [
    {
      label: "Registration Opens",
      date: event.registrationStartAt,
      icon: UsersIcon,
      status:
        event.registrationStartAt &&
        new Date(event.registrationStartAt) <= new Date()
          ? "past"
          : "future",
    },
    {
      label: "Registration Closes",
      date: event.registrationEndAt,
      icon: UsersIcon,
      status:
        event.registrationEndAt &&
        new Date(event.registrationEndAt) <= new Date()
          ? "past"
          : "future",
    },
    {
      label: "Event Starts",
      date: event.startDate,
      icon: CalendarIcon,
      status:
        event.startDate && new Date(event.startDate) <= new Date()
          ? "past"
          : "future",
    },
    {
      label: "Submissions Open",
      date: event.submissionStartAt,
      icon: CodeIcon,
      status:
        event.submissionStartAt &&
        new Date(event.submissionStartAt) <= new Date()
          ? "past"
          : "future",
    },
    {
      label: "Submission Deadline",
      date: event.submissionDeadline,
      icon: ClockIcon,
      status:
        event.submissionDeadline &&
        new Date(event.submissionDeadline) <= new Date()
          ? "past"
          : "future",
    },
    {
      label: "Judging Starts",
      date: event.judgingStartAt,
      icon: ShieldIcon,
      status:
        event.judgingStartAt && new Date(event.judgingStartAt) <= new Date()
          ? "past"
          : "future",
    },
    {
      label: "Judging Ends",
      date: event.judgingEndAt,
      icon: ShieldIcon,
      status:
        event.judgingEndAt && new Date(event.judgingEndAt) <= new Date()
          ? "past"
          : "future",
    },
    {
      label: "Results Announced",
      date: event.resultsPublishedAt,
      icon: TrophyIcon,
      status:
        event.resultsPublishedAt &&
        new Date(event.resultsPublishedAt) <= new Date()
          ? "past"
          : "future",
    },
  ].filter((t) => t.date);

  return (
    <div className="space-y-6">
      {timeline.map((item, index) => (
        <div className="relative flex gap-4" key={item.label}>
          <div className="flex flex-col items-center">
            <div
              className={`relative z-10 flex size-10 items-center justify-center rounded-full ${item.status === "past" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              <item.icon className="size-5" />
            </div>
            {index < timeline.length - 1 && (
              <div className="absolute top-10 bottom-0 left-4.5 w-0.5 bg-border" />
            )}
          </div>
          <div className="flex-1 pt-1">
            <h3 className="font-medium text-foreground">{item.label}</h3>
            <p className="text-muted-foreground text-sm">
              {formatDateTime(item.date!)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TracksPrizesTab({ eventId }: { eventId: string }) {
  const { data: adminData, isLoading } = useQuery(
    orpc.events.getAdmin.queryOptions({ eventId })
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 font-display font-semibold text-foreground text-xl">
          Tracks
        </h2>
        {adminData?.tracks?.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {adminData.tracks.map((track: any) => (
              <Card className="p-4" key={track.id} variant="default">
                <h3 className="font-semibold text-foreground">{track.name}</h3>
                {track.description && (
                  <p className="mt-2 text-muted-foreground text-sm">
                    {track.description}
                  </p>
                )}
                {track.maxSubmissions && (
                  <p className="mt-2 text-muted-foreground text-sm">
                    Max submissions: {track.maxSubmissions}
                  </p>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No tracks configured.</p>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-display font-semibold text-foreground text-xl">
          Prizes
        </h2>
        {adminData?.prizes?.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {adminData.prizes.map((prize: any) => (
              <Card className="p-4" key={prize.id} variant="default">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {prize.name}
                    </h3>
                    {prize.description && (
                      <p className="mt-1 text-muted-foreground text-sm">
                        {prize.description}
                      </p>
                    )}
                    {prize.trackId && (
                      <p className="mt-1 text-muted-foreground text-sm">
                        Track-specific prize
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {prize.value && (
                      <div className="font-bold font-display text-2xl text-primary">
                        {prize.value} {prize.currency || "USD"}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No prizes configured.</p>
        )}
      </section>
    </div>
  );
}

function RulesTab({ event }: { event: any }) {
  return (
    <div className="prose prose-muted max-w-none space-y-6">
      <h2 className="mb-4 font-display font-semibold text-foreground text-xl">
        Rules & Eligibility
      </h2>
      <div className="space-y-4">
        <RuleItem
          description={`Teams must have ${event.minTeamSize} to ${event.maxTeamSize} members. ${event.allowIndividuals ? "Individual participation is allowed." : "Individual participation is not allowed; you must join or form a team."}`}
          title="Team Composition"
        />
        <RuleItem
          description="All participants must adhere to our Code of Conduct. Harassment, discrimination, or disruptive behavior will result in disqualification."
          title="Code of Conduct"
        />
        <RuleItem
          description="All projects must be original work created during the hackathon. Pre-existing projects are not eligible unless explicitly stated in the track rules."
          title="Original Work"
        />
        <RuleItem
          description="Participants retain ownership of their projects. By submitting, you grant the organizers a license to showcase your project for promotional purposes."
          title="Intellectual Property"
        />
        <RuleItem
          description="You may use third-party APIs, libraries, and services. Please ensure you comply with their terms of service."
          title="Third-Party Services"
        />
        <RuleItem
          description="Submissions must include a repository URL, a brief description, and a demo video or live demo link. Additional requirements may apply per track."
          title="Submission Requirements"
        />
      </div>
    </div>
  );
}

function RuleItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 rounded-lg bg-muted/30 p-4">
      <CheckIcon className="mt-0.5 size-5 shrink-0 text-primary" />
      <div>
        <h3 className="font-medium text-foreground">{title}</h3>
        <p className="mt-1 text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  );
}

function FAQTab({ event }: { event: any }) {
  const faqs = [
    {
      q: "Who can participate?",
      a: "Anyone! Students, professionals, and hobbyists are all welcome. Check specific tracks for any eligibility requirements.",
    },
    {
      q: "Do I need a team to register?",
      a: event.allowIndividuals
        ? "No, you can participate individually or form a team."
        : "Yes, you must be part of a team. You can create one during registration or join an existing team.",
    },
    {
      q: "Can I submit multiple projects?",
      a: "Each team can submit one project per track. Check individual track rules for specifics.",
    },
    {
      q: "What happens after I submit?",
      a: "Your project will be reviewed by judges during the judging phase. You'll be notified of results when they're announced.",
    },
    {
      q: "Is there a cost to participate?",
      a: "Most hackathons are free to enter. Check the event details for any specific fees.",
    },
    {
      q: "How are winners selected?",
      a: "Judges evaluate projects based on criteria like functionality, innovation, design, and impact. Scores are normalized and aggregated.",
    },
  ];

  return (
    <div className="space-y-4">
      {faqs.map((faq, i) => (
        <details
          className="group overflow-hidden rounded-lg bg-muted/30"
          key={i}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between p-4">
            <h3 className="font-medium text-foreground">{faq.q}</h3>
            <ChevronRightIcon className="size-5 text-muted-foreground transition-transform group-open:rotate-90" />
          </summary>
          <div className="px-4 pb-4 text-muted-foreground text-sm">{faq.a}</div>
        </details>
      ))}
    </div>
  );
}

function HackathonDetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
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
      <Tabs defaultIndex={0}>
        <TabsList>
          <TabsTrigger index={0}>
            <Skeleton className="h-8 w-24" />
          </TabsTrigger>
          <TabsTrigger index={1}>
            <Skeleton className="h-8 w-24" />
          </TabsTrigger>
          <TabsTrigger index={2}>
            <Skeleton className="h-8 w-24" />
          </TabsTrigger>
        </TabsList>
        <TabsContent className="mt-6 space-y-6" index={0}>
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-32 w-full" />
        </TabsContent>
        <TabsContent className="mt-6 space-y-6" index={1}>
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-32 w-full" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) {
    return `${Math.abs(days)} days ago`;
  }
  if (days === 0) {
    return "Today";
  }
  if (days === 1) {
    return "Tomorrow";
  }
  return `in ${days} days`;
}
