import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { JudgeSidebar } from "@/components/judge-sidebar";
import { sessionQueryOptions } from "@/lib/session";
import { client } from "@/utils/orpc";

export const Route = createFileRoute("/(judge)")({
  component: JudgeLayout,
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
    const me = await client.me();
    if (me.role !== "judge" && me.role !== "admin") {
      throw redirect({ to: "/dashboard" });
    }
    return { session: { user } };
  },
});

function JudgeLayout() {
  return (
    <div className="flex min-h-screen">
      <JudgeSidebar />
      <main className="min-w-0 flex-1 lg:pl-64">
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
