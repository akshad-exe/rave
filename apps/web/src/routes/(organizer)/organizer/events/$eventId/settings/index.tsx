import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

import {
  EventSettingsPage,
  type SettingsTab,
  settingsSearchSchema,
} from "@/components/features/organizer-settings";

/**
 * Thin by design: this file declares the path and the search schema, and hands
 * the params to the feature. Keeping the page here meant the generator had to
 * read 1160 lines of UI to build one route table entry.
 */
export const Route = createFileRoute(
  "/(organizer)/organizer/events/$eventId/settings/"
)({
  validateSearch: settingsSearchSchema,
  component: SettingsRoute,
});

function SettingsRoute() {
  const { eventId } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const handleTabChange = useCallback(
    (next: SettingsTab) => {
      navigate({ search: (previous) => ({ ...previous, tab: next }) });
    },
    [navigate]
  );

  return (
    <EventSettingsPage
      eventId={eventId}
      onTabChange={handleTabChange}
      tab={tab}
    />
  );
}
