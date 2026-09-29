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
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { orpc } from "@/utils/orpc";
import {
  type AuditRow,
  type EventAuditRow,
  fmtDate,
  PAGE_SIZE,
} from "./shared";

/**
 * The audit trail, platform-wide and per event.
 *
 * This is the surface Judging Integrity leans on: without it, reading who
 * changed a score or published a result means querying the database directly.
 * The per-event view is guarded on a chosen event rather than firing a query
 * with an empty id and refetching afterwards.
 */

export function PageControls({
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
        onClick={shift(onPage, page, -1)}
        size="sm"
        variant="outline"
      >
        Previous
      </Button>
      <span className="text-muted-foreground text-sm">Page {page}</span>
      <Button onClick={shift(onPage, page, 1)} size="sm" variant="outline">
        Next
      </Button>
    </div>
  );
}

function shift(onPage: (page: number) => void, page: number, delta: number) {
  return () => {
    onPage(Math.max(1, page + delta));
  };
}

export function PlatformAuditPanel() {
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

export function EventAuditPanel() {
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

export function AuditRowView({ row }: { row: AuditRow | EventAuditRow }) {
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
