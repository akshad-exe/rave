import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { JudgeSidebar } from "@/components/judge-sidebar";
import { authClient } from "@/lib/auth-client";
import { client } from "@/utils/orpc";

export const Route = createFileRoute("/(judge)")({
  component: JudgeLayout,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
    const me = await client.me();
    if (me.role !== "judge" && me.role !== "admin") {
      throw redirect({ to: "/dashboard" });
    }
    return { session: session.data };
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
