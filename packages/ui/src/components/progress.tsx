import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { cn } from "@rave/ui/lib/utils";
import type * as React from "react";

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-muted",
        className
      )}
      data-slot="progress"
      value={value}
      {...props}
    >
      <ProgressPrimitive.Value
        className={cn(
          "h-full rounded-full bg-primary transition-all duration-300 ease-out",
          value === 0 && "w-0"
        )}
        data-slot="progress-value"
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
