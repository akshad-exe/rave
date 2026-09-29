import { Alert } from "@rave/ui/components/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@rave/ui/components/tabs";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { orpc } from "@/utils/orpc";
import { EventAuditPanel, PlatformAuditPanel } from "./audit";
import { AdminSkeleton } from "./shared";
import { UsersPanel } from "./users";

/**
 * Platform administration: roles, and the audit trail every scoring decision
 * is recorded in.
 *
 * The role check is client-side for a friendlier message, but the server
 * gates every one of these operations independently, so hiding the page is
 * presentation rather than security.
 */
export function AdminPage() {
  const meQuery = useQuery(orpc.me.queryOptions());

  if (meQuery.status === "pending") {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <AdminSkeleton />
      </div>
    );
  }

  if (meQuery.data?.role !== "admin") {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          backLabel="Back to organizer"
          description="Roles across the platform, and the audit trail every scoring decision is recorded in."
          title="Admin"
          to="/organizer"
        />
        <Alert
          description="Only an admin account can reach this page. If you expected access, ask an existing admin to change your role."
          title="Admins only"
          variant="warning"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        backLabel="Back to organizer"
        description="Roles across the platform, and the audit trail every scoring decision is recorded in."
        title="Admin"
        to="/organizer"
      />
      <Tabs>
        <TabsList>
          <TabsTrigger index={0}>Users &amp; roles</TabsTrigger>
          <TabsTrigger index={1}>Platform audit log</TabsTrigger>
          <TabsTrigger index={2}>Event audit log</TabsTrigger>
        </TabsList>
        <TabsContent index={0}>
          <UsersPanel />
        </TabsContent>
        <TabsContent index={1}>
          <PlatformAuditPanel />
        </TabsContent>
        <TabsContent index={2}>
          <EventAuditPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
