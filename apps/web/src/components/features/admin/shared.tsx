import type { client } from "@/utils/orpc";

export type UserRow = Awaited<
  ReturnType<typeof client.admin.listUsers>
>[number];
export type AuditRow = Awaited<
  ReturnType<typeof client.admin.platformAuditLog>
>[number];
export type EventAuditRow = Awaited<
  ReturnType<typeof client.admin.auditLog>
>[number];

export const ROLES = [
  "visitor",
  "participant",
  "judge",
  "organizer",
  "admin",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_TONE: Record<
  string,
  "default" | "outline" | "subtle" | "success"
> = {
  admin: "default",
  judge: "subtle",
  organizer: "success",
  participant: "outline",
  visitor: "outline",
};

export const PAGE_SIZE = 25;

export function fmtDate(value: Date | string): string {
  return new Date(value).toLocaleString();
}

/** Placeholder for the page shell while the caller's role is resolved. */
export function AdminSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-40 animate-pulse rounded bg-muted" />
      <div className="h-72 w-full animate-pulse rounded bg-muted" />
    </div>
  );
}
