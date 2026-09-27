export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
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
