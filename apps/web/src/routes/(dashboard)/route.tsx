import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Sidebar } from "@/components/sidebar";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/(dashboard)")({
  component: DashboardLayout,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
    return { session: session.data };
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
