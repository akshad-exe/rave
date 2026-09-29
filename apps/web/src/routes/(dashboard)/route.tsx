import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Sidebar } from "@/components/sidebar";
import { sessionQueryOptions } from "@/lib/session";

export const Route = createFileRoute("/(dashboard)")({
  component: DashboardLayout,
  beforeLoad: async ({ context }) => {
    // Cached across navigations. A bare getSession() here re-fetched on every
    // sidebar click, and a slow or failed response read as "signed out", which
    // bounced people to /login mid-session.
    const user = await context.queryClient.ensureQueryData(
      sessionQueryOptions()
    );
    if (!user) {
      throw redirect({ to: "/login" });
    }
    return { session: { user } };
  },
});

function DashboardLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1 lg:pl-64">
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
