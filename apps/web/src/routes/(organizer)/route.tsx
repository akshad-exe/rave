import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { OrganizerSidebar } from "@/components/organizer-sidebar";
import { authClient } from "@/lib/auth-client";
import { client } from "@/utils/orpc";

export const Route = createFileRoute("/(organizer)")({
  component: OrganizerLayout,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
    const me = await client.me();
    if (me.role !== "organizer" && me.role !== "admin") {
      throw redirect({ to: "/dashboard" });
    }
    return { session: session.data };
  },
});

function OrganizerLayout() {
  return (
    <div className="flex min-h-screen">
      <OrganizerSidebar />
      <main className="min-w-0 flex-1 lg:pl-64">
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
