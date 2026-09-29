import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import type * as React from "react";

/**
 * The header every organizer page opens with: a back link, a title and a line
 * of context.
 *
 * Four feature modules had grown their own copy of this block during the
 * extraction, which is how they drifted. The destination is typed as the
 * router's own paths so a renamed route fails at build time rather than
 * rendering a 404 — the reason this uses `Link` and not a bare anchor.
 */
export function PageHeader({
  title,
  description,
  to,
  backLabel = "Back",
}: {
  backLabel?: string;
  description: string;
  title: string;
  to: string;
}) {
  return (
    <header className="flex flex-col gap-1">
      <Link
        className="mb-2 flex w-fit items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
        to={to}
      >
        <ArrowLeftIcon className="size-3.5" />
        {backLabel}
      </Link>
      <h1 className="font-bold font-display text-3xl text-foreground">
        {title}
      </h1>
      <p className="text-muted-foreground">{description}</p>
    </header>
  );
}

/**
 * Placeholder for a page body while its first query resolves. Matched to the
 * card layout most pages use, per the design system's guidance that a skeleton
 * should mirror the final structure rather than be generic rectangles.
 */
export function PageSkeleton({
  cards = 2,
  className = "mx-auto max-w-4xl space-y-6",
}: {
  cards?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: cards }, (_, index) => (
        <div
          className="mb-6 h-40 w-full animate-pulse rounded-lg bg-muted"
          // Index is the identity here: these are indistinguishable placeholders
          // with no stable id of their own.
          key={`skeleton-${String(index)}`}
        />
      ))}
    </div>
  );
}

export type PageHeaderProps = React.ComponentProps<typeof PageHeader>;
