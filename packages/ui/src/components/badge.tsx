import { cn } from "@rave/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium text-xs transition-colors",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        accent: "bg-accent text-accent-foreground",
        default: "bg-muted text-muted-foreground",
        error: "bg-error/10 text-error",
        outline: "border border-border bg-transparent text-foreground",
        primary: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        subtle: "bg-accent/10 text-accent",
        success: "bg-success/10 text-success",
        warning: "bg-warning/10 text-warning",
      },
    },
  }
);

function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ className, variant }))} {...props} />
  );
}

export { Badge, badgeVariants };
