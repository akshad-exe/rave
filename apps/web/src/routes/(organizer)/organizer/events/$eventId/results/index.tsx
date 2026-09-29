import { createFileRoute } from "@tanstack/react-router";

import { ResultsPage } from "@/components/features/organizer-results";

export const Route = createFileRoute(
  "/(organizer)/organizer/events/$eventId/results/"
)({
  component: ResultsRoute,
});

function ResultsRoute() {
  const { eventId } = Route.useParams();
  return <ResultsPage eventId={eventId} />;
}
