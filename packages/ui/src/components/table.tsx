import { cn } from "@rave/ui/lib/utils";
import type * as React from "react";

/**
 * Table primitives.
 *
 * The judging console, the results page and the CSV import preview all need to
 * present tabular data, and each was reaching for raw `<table>` markup with
 * slightly different padding and header styling. These are the shared versions
 * so the three read as one system.
 *
 * Deliberately unopinionated about layout: `Table` is a plain `w-full` table
 * with collapsed borders, and callers wrap it in an `overflow-x-auto` div when
 * the column count can overflow on narrow viewports. The primitives add no
 * wrappers of their own so they compose with whatever the page is doing.
 */
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <table
      className={cn("w-full border-collapse text-sm", className)}
      data-slot="table"
      {...props}
    />
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      className={cn("[&_tr]:border-b", className)}
      data-slot="table-header"
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      className={cn("[&_tr:last-child]:border-0", className)}
      data-slot="table-body"
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "border-border/60 border-b transition-colors hover:bg-muted/30 data-[state=selected]:bg-muted",
        className
      )}
      data-slot="table-row"
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "h-9 whitespace-nowrap px-3 text-left align-middle font-medium text-muted-foreground text-xs [&:has([role=checkbox])]:pr-0",
        className
      )}
      data-slot="table-head"
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      className={cn(
        "whitespace-nowrap px-3 py-2.5 align-middle [&:has([role=checkbox])]:pr-0",
        className
      )}
      data-slot="table-cell"
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      className={cn("mt-3 text-muted-foreground text-xs", className)}
      data-slot="table-caption"
      {...props}
    />
  );
}

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
};
