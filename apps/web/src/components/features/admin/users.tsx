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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { handleAsync, handleDialogClose } from "@/lib/handlers";
import { orpc } from "@/utils/orpc";
import { PageControls } from "./audit";
import {
  fmtDate,
  PAGE_SIZE,
  ROLE_TONE,
  ROLES,
  type Role,
  type UserRow,
} from "./shared";

/**
 * Users and their platform roles.
 *
 * A role change takes effect immediately and is recorded in the audit log with
 * the admin who made it, so it is behind a confirmation that names the change
 * rather than a bare save.
 */

export function UsersPanel() {
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
        onOpenChange={handleDialogClose(() => {
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
            <AlertDialogAction onClick={handleAsync(handleConfirm)}>
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
