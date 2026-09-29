import { Alert } from "@rave/ui/components/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@rave/ui/components/tabs";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  CalendarIcon,
  GiftIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import { useCallback } from "react";
import { z } from "zod";
import { orpc } from "@/utils/orpc";
import { EventDetailsPanel } from "./details";
import { PrizesPanel } from "./prizes";
import { type AdminEvent, SettingsSkeleton } from "./shared";
import { TracksPanel } from "./tracks";

/**
 * Event settings, as three panels behind tabs.
 *
 * The panels were one 1160-line file stacked as a long scroll. Splitting them
 * is worth more than the line count suggests: only the active panel mounts, so
 * opening the page no longer fires the event, track and prize queries together
 * for an organizer who only wanted to fix a deadline.
 *
 * The active tab is owned by the route's search params, so it is shareable,
 * survives a reload, and the back button steps through tabs. This module stays
 * path-agnostic — the route file supplies the id and the tab rather than the
 * component reaching for `useParams` with a hardcoded route id.
 */

export const SETTINGS_TABS = [
  { icon: SlidersHorizontalIcon, label: "Details", value: "details" },
  { icon: CalendarIcon, label: "Tracks", value: "tracks" },
  { icon: GiftIcon, label: "Prizes", value: "prizes" },
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number]["value"];

export const settingsSearchSchema = z.object({
  tab: z
    .enum(["details", "prizes", "tracks"])
    .catch("details")
    .default("details"),
});

export function EventSettingsPage({
  eventId,
  tab,
  onTabChange,
}: {
  eventId: string;
  onTabChange: (tab: SettingsTab) => void;
  tab: SettingsTab;
}) {
  const eventQuery = useQuery(
    orpc.events.getAdmin.queryOptions({ input: { eventId } })
  );

  const activeIndex = Math.max(
    0,
    SETTINGS_TABS.findIndex((t) => t.value === tab)
  );

  const handleChange = useCallback(
    (index: number) => {
      const next = SETTINGS_TABS[index];
      if (next) {
        onTabChange(next.value);
      }
    },
    [onTabChange]
  );

  if (eventQuery.status === "pending") {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader />
        <SettingsSkeleton />
      </div>
    );
  }

  if (!eventQuery.data) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader />
        <Alert
          description="We could not load this event."
          title="Event unavailable"
          variant="destructive"
        />
      </div>
    );
  }

  const event: AdminEvent = eventQuery.data.event;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader name={event.name} />
      <Tabs defaultIndex={activeIndex} onChange={handleChange}>
        <TabsList className="w-full sm:w-auto">
          {SETTINGS_TABS.map(({ icon: Icon, label }, index) => (
            <TabsTrigger
              className="flex-1 sm:flex-none"
              index={index}
              key={label}
            >
              <Icon className="size-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent index={0}>
          <EventDetailsPanel event={event} eventId={eventId} />
        </TabsContent>
        <TabsContent index={1}>
          <TracksPanel eventId={eventId} />
        </TabsContent>
        <TabsContent index={2}>
          <PrizesPanel eventId={eventId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PageHeader({ name }: { name?: string }) {
  return (
    <header className="flex flex-col gap-1">
      <a
        className="mb-2 flex w-fit items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
        href="/organizer/events"
      >
        <ArrowLeftIcon className="size-3.5" />
        Back to events
      </a>
      <h1 className="font-bold font-display text-3xl text-foreground">
        {name ? `${name} settings` : "Event settings"}
      </h1>
      <p className="text-muted-foreground">
        Change the details, schedule, tracks and prizes of this event.
      </p>
    </header>
  );
}
