import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cn } from "@rave/ui/lib/utils";
import type * as React from "react";
import { useCallback } from "react";

/**
 * Tabs are addressed by a numeric `index` rather than a string `value`, because
 * every caller in this app lays out a fixed, ordered set of panels. `index` is
 * translated to base-ui's `value` so the primitive owns selection, roving
 * focus, and the `aria-*` wiring.
 */
interface TabsProps {
  children: React.ReactNode;
  className?: string;
  defaultIndex?: number;
  onChange?: (index: number) => void;
}

function Tabs({ children, className, defaultIndex = 0, onChange }: TabsProps) {
  const handleValueChange = useCallback(
    (value: unknown) => {
      if (typeof value === "number") {
        onChange?.(value);
      }
    },
    [onChange]
  );

  return (
    <TabsPrimitive.Root
      className={cn("w-full", className)}
      data-index={defaultIndex}
      data-slot="tabs"
      defaultValue={defaultIndex}
      onValueChange={handleValueChange}
    >
      {children}
    </TabsPrimitive.Root>
  );
}

function TabsList({
  children,
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "flex items-center gap-1 rounded-md bg-muted p-1",
        className
      )}
      data-slot="tabs-list"
      {...props}
    >
      {children}
    </TabsPrimitive.List>
  );
}

interface TabsTriggerProps
  extends Omit<React.ComponentProps<typeof TabsPrimitive.Tab>, "value"> {
  index: number;
}

function TabsTrigger({
  children,
  className,
  index,
  ...props
}: TabsTriggerProps) {
  return (
    <TabsPrimitive.Tab
      className={cn(
        "relative flex size-full items-center justify-center gap-1.5 rounded-sm px-3 py-1.5 font-medium text-muted-foreground text-sm outline-none transition-all",
        "hover:text-foreground",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-selected:bg-background data-selected:text-foreground data-selected:shadow-sm",
        className
      )}
      data-slot="tabs-trigger"
      value={index}
      {...props}
    >
      {children}
    </TabsPrimitive.Tab>
  );
}

interface TabsContentProps
  extends Omit<React.ComponentProps<typeof TabsPrimitive.Panel>, "value"> {
  index: number;
}

function TabsContent({
  children,
  className,
  index,
  ...props
}: TabsContentProps) {
  return (
    <TabsPrimitive.Panel
      className={cn(
        "mt-4 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
        className
      )}
      data-slot="tabs-content"
      value={index}
      {...props}
    >
      {children}
    </TabsPrimitive.Panel>
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
