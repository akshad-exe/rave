import { createFileRoute } from "@tanstack/react-router";

import { AdminPage } from "@/components/features/admin";

export const Route = createFileRoute("/(organizer)/organizer/admin/")({
  component: AdminPage,
});
