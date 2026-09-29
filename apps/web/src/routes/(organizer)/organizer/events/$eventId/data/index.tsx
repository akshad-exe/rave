import { createFileRoute } from "@tanstack/react-router";

import { DataPage } from "@/components/features/organizer-data";

export const Route = createFileRoute(
  "/(organizer)/organizer/events/$eventId/data/"
)({
  component: DataRoute,
});

function DataRoute() {
  const { eventId } = Route.useParams();
  return <DataPage eventId={eventId} />;
}
