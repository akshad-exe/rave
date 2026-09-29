import { Alert } from "@rave/ui/components/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@rave/ui/components/tabs";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon } from "lucide-react";
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
        <PageHeader />
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
      <PageHeader />
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

function PageHeader() {
  return (
    <header className="flex flex-col gap-1">
      <a
        className="mb-2 flex w-fit items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
        href="/organizer"
      >
        <ArrowLeftIcon className="size-3.5" />
        Back to organizer
      </a>
      <h1 className="font-bold font-display text-3xl text-foreground">Admin</h1>
      <p className="text-muted-foreground">
        Roles across the platform, and the audit trail every scoring decision is
        recorded in.
      </p>
    </header>
  );
}
