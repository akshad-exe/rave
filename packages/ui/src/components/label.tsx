"use client";

import { cn } from "@rave/ui/lib/utils";
import type * as React from "react";

type LabelProps = React.ComponentProps<"span"> & {
  as?: "label" | "span";
  /** Only meaningful with `as="label"`; accepted here so adjacent-text usage can pass it through. */
  htmlFor?: string;
};

/**
 * Renders a `<span>` by default.
 *
 * A `<label>` without `htmlFor` points at no control, so callers that use
 * `Label` purely as adjacent text get a `<span>` and keep valid markup. Pass
 * `as="label"` for a real form label.
 */
function Label({ as = "span", className, ...props }: LabelProps) {
  const Component = as as React.ElementType;
  return (
    <Component
      className={cn(
        "flex select-none items-center gap-1.5 font-medium text-foreground text-label peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
        className
      )}
      data-slot="label"
      {...props}
    />
  );
}

export { Label };
