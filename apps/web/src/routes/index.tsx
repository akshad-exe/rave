import { Button } from "@rave/ui/components/button";
import { Card } from "@rave/ui/components/card";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarIcon,
  ClockIcon,
  CodeIcon,
  MapPinIcon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-muted/50 to-background py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 font-medium text-primary text-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              Sample Hack 2026 is live — Registration open
            </div>
            <h1 className="text-balance font-bold font-display text-4xl text-foreground tracking-tight sm:text-5xl lg:text-6xl">
              Build something{" "}
              <span className="text-primary">worth remembering</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              The hackathon platform for builders. Discover events, form teams,
              submit projects, and win prizes — all in one place.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/hackathons">
                <Button className="gap-2" size="lg">
                  <CodeIcon className="size-4" />
                  Explore Hackathons
                </Button>
              </Link>
              <Link to="/gallery">
                <Button className="gap-2" size="lg" variant="outline">
                  <TrophyIcon className="size-4" />
                  View Gallery
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4">
            <StatCard icon={CalendarIcon} label="Active Tracks" value="8" />
            <StatCard icon={UsersIcon} label="Teams Registered" value="40+" />
            <StatCard icon={CodeIcon} label="Projects Submitted" value="35+" />
            <StatCard icon={TrophyIcon} label="Prize Pool" value="$50k+" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-background py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="font-bold font-display text-3xl text-foreground sm:text-4xl">
              Everything you need to hack
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              From discovery to submission — a seamless experience for every
              participant.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              description="Browse hackathons with powerful filters — by track, location, dates, prize pool, and more."
              icon={CodeIcon}
              title="Discover Events"
            />
            <FeatureCard
              description="Create or join teams, invite members, and manage your roster before the event starts."
              icon={UsersIcon}
              title="Build Your Team"
            />
            <FeatureCard
              description="Never miss a submission deadline. Get notifications for registration, submission, and judging phases."
              icon={CalendarIcon}
              title="Track Deadlines"
            />
            <FeatureCard
              description="Submit projects with rich media, track judging progress, and see results in real-time."
              icon={TrophyIcon}
              title="Compete & Win"
            />
            <FeatureCard
              description="Support for hybrid events with venue details, travel info, and virtual participation options."
              icon={MapPinIcon}
              title="Online & In-Person"
            />
            <FeatureCard
              description="Real-time announcements, schedule changes, and organizer communications throughout the event."
              icon={ClockIcon}
              title="Live Updates"
            />
          </div>
        </div>
      </section>

      {/* Current Event */}
      <section className="bg-muted/30 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-bold font-display text-3xl text-foreground sm:text-4xl">
                Happening Now: Sample Hack 2026
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                The flagship hackathon is in its submission phase. 40+ teams are
                building across 8 tracks including Developer Tools, Data &
                Analytics, Accessibility, Security, Climate, Health, Education,
                and Open Hardware.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Badge variant="subtle">Submission Phase</Badge>
                <Badge variant="outline">Ends Mar 1, 2026</Badge>
                <Badge variant="outline">Online + SF Venue</Badge>
              </div>
              <div className="mt-8 flex gap-4">
                <Link
                  params={{ slug: "sample-hack-2026" }}
                  search={{ tab: "overview" }}
                  to="/hackathons/$slug"
                >
                  <Button className="gap-2" size="lg">
                    View Details
                    <CodeIcon className="size-4" />
                  </Button>
                </Link>
                <Link to="/hackathons">
                  <Button className="gap-2" size="lg" variant="outline">
                    Browse All Events
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <Card className="overflow-hidden" variant="elevated">
                <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                  <div className="p-8 text-center">
                    <CodeIcon className="mx-auto mb-4 size-16 text-primary/30" />
                    <p className="text-muted-foreground">
                      Event dashboard preview
                    </p>
                    <p className="mt-2 text-muted-foreground/70 text-xs">
                      Timeline · Teams · Submissions · Judging
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-background py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-bold font-display text-3xl text-foreground sm:text-4xl">
            Ready to build?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join thousands of builders creating the future, one hackathon at a
            time.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/login">
              <Button className="w-full gap-2 sm:w-auto" size="lg">
                <UsersIcon className="size-4" />
                Create Free Account
              </Button>
            </Link>
            <Link to="/hackathons">
              <Button className="w-full sm:w-auto" size="lg" variant="outline">
                Browse Events
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
}) {
  return (
    <Card className="p-6 text-center" variant="borderless">
      <div className="mx-auto mb-3 text-primary">
        <Icon className="size-8" />
      </div>
      <div className="font-bold font-display text-3xl text-foreground sm:text-4xl">
        {value}
      </div>
      <div className="mt-1 text-muted-foreground text-sm">{label}</div>
    </Card>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Card className="p-6 transition-shadow hover:shadow-md" variant="default">
      <div className="mb-4 text-primary">
        <Icon className="size-6" />
      </div>
      <h3 className="mb-2 font-display font-semibold text-foreground text-lg">
        {title}
      </h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </Card>
  );
}

import { Badge } from "@rave/ui/components/badge";
