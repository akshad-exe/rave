import { createFileRoute } from "@tanstack/react-router";

import { JudgingConsole } from "@/components/features/organizer-judging";

/**
 * Thin by design: the path is declared here and the page lives in the feature
 * module, so the route generator reads three lines instead of 844.
 */
export const Route = createFileRoute(
  "/(organizer)/organizer/events/$eventId/judging/"
)({
  component: JudgingRoute,
});

function JudgingRoute() {
  const { eventId } = Route.useParams();
  return <JudgingConsole eventId={eventId} />;
}
