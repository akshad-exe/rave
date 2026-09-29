import { Alert } from "@rave/ui/components/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@rave/ui/components/alert-dialog";
import { Badge } from "@rave/ui/components/badge";
import { Button } from "@rave/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rave/ui/components/card";
import { Input } from "@rave/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@rave/ui/components/select";
import { Skeleton } from "@rave/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@rave/ui/components/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@rave/ui/components/tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import type * as React from "react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { type client, orpc } from "@/utils/orpc";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserRow = Awaited<ReturnType<typeof client.admin.listUsers>>[number];
type AuditRow = Awaited<
  ReturnType<typeof client.admin.platformAuditLog>
>[number];
type EventAuditRow = Awaited<ReturnType<typeof client.admin.auditLog>>[number];

const ROLES = [
  "visitor",
  "participant",
  "judge",
  "organizer",
  "admin",
] as const;
type Role = (typeof ROLES)[number];

const ROLE_TONE: Record<string, "default" | "outline" | "subtle" | "success"> =
  {
    admin: "default",
    judge: "subtle",
    organizer: "success",
    participant: "outline",
    visitor: "outline",
  };

const PAGE_SIZE = 25;

function fmtDate(value: Date | string): string {
  return new Date(value).toLocaleString();
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/(organizer)/organizer/admin/")({
  component: AdminPage,
});

// ─── Page ─────────────────────────────────────────────────────────────────────

function AdminPage() {
  const meQuery = useQuery(orpc.me.queryOptions());

  if (meQuery.status === "pending") {
    return <AdminSkeleton />;
  }

  if (meQuery.data?.role !== "admin") {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <BackLink />
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
      <header className="flex flex-col gap-1">
        <BackLink />
        <h1 className="font-bold font-display text-3xl text-foreground">
          Admin
        </h1>
        <p className="text-muted-foreground">
          Roles across the platform, and the audit trail every scoring decision
          is recorded in.
        </p>
      </header>

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

function BackLink() {
  return (
    <Link
      className="mb-2 flex w-fit items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
      to="/organizer"
    >
      <ArrowLeftIcon className="size-3.5" />
      Back to organizer
    </Link>
  );
}

// ─── Users & roles ────────────────────────────────────────────────────────────

function UsersPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<{ row: UserRow; role: Role } | null>(
    null
  );

  const usersQuery = useQuery(
    orpc.admin.listUsers.queryOptions({ input: { limit: PAGE_SIZE, page } })
  );

  const setRole = useMutation(orpc.admin.setRole.mutationOptions());

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  const handlePage = useCallback((next: number) => {
    setPage(next);
  }, []);

  const handleRoleChange = useCallback(
    (row: UserRow) => (value: string | null) => {
      const role = value as Role | null;
      if (role && role !== row.role) {
        setPending({ role, row });
      }
    },
    []
  );

  const handleConfirm = useCallback(async () => {
    if (!pending) {
      return;
    }
    try {
      await setRole.mutateAsync({ role: pending.role, userId: pending.row.id });
      toast.success(`${pending.row.name} is now ${pending.role}`);
      setPending(null);
      queryClient
        .invalidateQueries(
          orpc.admin.listUsers.queryOptions({
            input: { limit: PAGE_SIZE, page },
          })
        )
        .catch(() => undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change role");
    }
  }, [page, pending, queryClient, setRole]);

  const rows = (usersQuery.data ?? []).filter((row) =>
    matchesSearch(row, search)
  );

  return (
    <Card variant="default">
      <CardHeader>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle>Users &amp; roles</CardTitle>
            <CardDescription>
              A role change is recorded in the audit log with the admin who made
              it.
            </CardDescription>
          </div>
          <div className="w-full sm:w-64">
            <Input
              onChange={handleSearch}
              placeholder="Filter by name or email…"
              value={search}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {usersQuery.status === "pending" ? (
          <div className="space-y-2">
            {(["a", "b", "c", "d"] as const).map((k) => (
              <Skeleton className="h-11 w-full" key={k} />
            ))}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <UserRoleRow
                      key={row.id}
                      onChange={handleRoleChange(row)}
                      row={row}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
            {rows.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground text-sm">
                No user matches that filter.
              </p>
            ) : null}
            <PageControls onPage={handlePage} page={page} />
          </>
        )}
      </CardContent>

      <AlertDialog
        onOpenChange={handleAlertOpen(() => {
          setPending(null);
        })}
        open={pending !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change this role?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending
                ? `${pending.row.name} goes from ${pending.row.role ?? "unset"} to ${pending.role}. This takes effect immediately across the platform.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={fire(handleConfirm)}>
              {setRole.isPending ? "Working…" : "Change role"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function matchesSearch(row: UserRow, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return (
    row.name?.toLowerCase().includes(q) === true ||
    row.email?.toLowerCase().includes(q) === true
  );
}

function UserRoleRow({
  row,
  onChange,
}: {
  onChange: (value: string | null) => void;
  row: UserRow;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{row.name ?? "—"}</TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {row.email}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {fmtDate(row.createdAt)}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Badge variant={ROLE_TONE[row.role ?? "visitor"] ?? "outline"}>
            {row.role ?? "visitor"}
          </Badge>
          <Select onValueChange={onChange} value={row.role ?? "visitor"}>
            <SelectTrigger className="w-36" />
            <SelectContent>
              {ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── Audit logs ───────────────────────────────────────────────────────────────

function PlatformAuditPanel() {
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);

  const logQuery = useQuery(
    orpc.admin.platformAuditLog.queryOptions({
      input: {
        action: action.trim() || undefined,
        limit: PAGE_SIZE,
        page,
      },
    })
  );

  const handleAction = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAction(e.target.value);
    setPage(1);
  }, []);

  const handlePage = useCallback((next: number) => {
    setPage(next);
  }, []);

  return (
    <Card variant="default">
      <CardHeader>
        <CardTitle>Platform audit log</CardTitle>
        <CardDescription>
          Every privileged action on the platform, newest first. This is the
          record an organizer can read instead of querying the database.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="w-full sm:w-72">
          <Input
            onChange={handleAction}
            placeholder="Filter by action, e.g. admin.set_role"
            value={action}
          />
        </div>
        <AuditRows
          onPage={handlePage}
          page={page}
          pending={logQuery.status === "pending"}
          rows={logQuery.data ?? []}
        />
      </CardContent>
    </Card>
  );
}

function EventAuditPanel() {
  const [eventId, setEventId] = useState("");
  const [page, setPage] = useState(1);

  const eventsQuery = useQuery(
    orpc.events.list.queryOptions({ input: { limit: 100, page: 1 } })
  );
  // Guarded rather than refetched: `enabled` is a sibling of `input`, and an
  // empty eventId is not a query worth sending.
  const logQuery = useQuery(
    orpc.admin.auditLog.queryOptions({
      enabled: eventId.length > 0,
      input: { eventId, limit: PAGE_SIZE, page },
    })
  );

  const handleEvent = useCallback((value: string | null) => {
    setEventId(value ?? "");
    setPage(1);
  }, []);

  const handlePage = useCallback((next: number) => {
    setPage(next);
  }, []);

  const events = eventsQuery.data?.events ?? [];

  return (
    <Card variant="default">
      <CardHeader>
        <CardTitle>Event audit log</CardTitle>
        <CardDescription>
          Scoped to one event: assignments, phase changes, publishing, and every
          scoring decision.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {events.length === 0 ? (
          <p className="text-muted-foreground text-sm">No events available.</p>
        ) : (
          <div className="w-full sm:w-72">
            <Select onValueChange={handleEvent} value={eventId || null}>
              <SelectTrigger>
                <span className="text-muted-foreground">
                  {eventId || "Choose an event…"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {events.map((ev) => (
                  <SelectItem key={ev.id} value={ev.id}>
                    {ev.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {eventId ? (
          <AuditRows
            onPage={handlePage}
            page={page}
            pending={logQuery.status === "pending"}
            rows={logQuery.data ?? []}
          />
        ) : (
          <p className="text-muted-foreground text-sm">
            Choose an event to see its audit trail.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AuditRows({
  rows,
  pending,
  page,
  onPage,
}: {
  onPage: (page: number) => void;
  page: number;
  pending: boolean;
  rows: Array<AuditRow | EventAuditRow>;
}) {
  if (pending) {
    return (
      <div className="space-y-2">
        {(["a", "b", "c", "d"] as const).map((k) => (
          <Skeleton className="h-10 w-full" key={k} />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="py-4 text-center text-muted-foreground text-sm">
        No entries recorded.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Resource</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <AuditRowView key={row.id} row={row} />
            ))}
          </TableBody>
        </Table>
      </div>
      <PageControls onPage={onPage} page={page} />
    </>
  );
}

function AuditRowView({ row }: { row: AuditRow | EventAuditRow }) {
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
        {fmtDate(row.createdAt)}
      </TableCell>
      <TableCell className="font-mono text-xs">{row.action}</TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {row.actorId ?? "system"}
        {row.actorRole ? ` · ${row.actorRole}` : ""}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {row.resourceType}
        {row.resourceId ? ` · ${row.resourceId.slice(0, 12)}` : ""}
      </TableCell>
    </TableRow>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function PageControls({
  page,
  onPage,
}: {
  onPage: (page: number) => void;
  page: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <Button
        disabled={page <= 1}
        onClick={changePage(onPage, page, -1)}
        size="sm"
        variant="outline"
      >
        Previous
      </Button>
      <span className="text-muted-foreground text-sm">Page {page}</span>
      <Button onClick={changePage(onPage, page, 1)} size="sm" variant="outline">
        Next
      </Button>
    </div>
  );
}

function changePage(
  onPage: (page: number) => void,
  page: number,
  delta: number
) {
  return () => {
    onPage(Math.max(1, page + delta));
  };
}

function fire(fn: () => Promise<void>) {
  return () => {
    fn();
  };
}

function handleAlertOpen(onClose: () => void) {
  return (next: boolean) => {
    if (!next) {
      onClose();
    }
  };
}

function AdminSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
