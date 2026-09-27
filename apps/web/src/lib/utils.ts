/**
 * Drizzle returns `timestamp` columns as `Date`, while some API rows are still
 * plain strings, so every helper here accepts either.
 */
export type DateLike = Date | number | string;

function toDate(value: DateLike): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatDate(value: DateLike): string {
  const date = toDate(value);
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: DateLike): string {
  const date = toDate(value);
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatRelativeTime(value: DateLike): string {
  const date = toDate(value);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) {
    return `${Math.abs(days)} days ago`;
  }
  if (days === 0) {
    return "Today";
  }
  if (days === 1) {
    return "Tomorrow";
  }
  return `in ${days} days`;
}

export function getEventStatusConfig(status: string): {
  label: string;
  variant:
    | "default"
    | "primary"
    | "secondary"
    | "accent"
    | "success"
    | "warning"
    | "error"
    | "outline"
    | "subtle";
} {
  switch (status) {
    case "draft":
      return { label: "Draft", variant: "outline" };
    case "registration":
      return { label: "Registration Open", variant: "success" };
    case "submission":
      return { label: "Submissions Open", variant: "accent" };
    case "judging":
      return { label: "Judging", variant: "warning" };
    case "results":
      return { label: "Results Published", variant: "primary" };
    case "archived":
      return { label: "Archived", variant: "default" };
    default:
      return { label: status, variant: "default" };
  }
}
