"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { cn } from "@rave/ui/lib/utils";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useCallback } from "react";

/**
 * Wraps `@base-ui/react/select`.
 *
 * The previous implementation was a `<div>` around a `<button>` that accepted
 * no `value` or `onValueChange`, so every filter dropdown built on it was inert.
 * This is the real primitive, so `value`/`onValueChange` are wired and the
 * listbox is keyboard-navigable and screen-reader legible.
 *
 * The composition API is unchanged: `Select` > `SelectTrigger` >
 * `SelectValue`, and `Select` > `SelectContent` > `SelectItem`.
 *
 * `onValueChange` receives `string | null` — base-ui uses `null` for "no
 * selection" — so callers coercing to a plain string need to handle it.
 */
function Select({
  onValueChange,
  ...props
}: SelectPrimitive.Root.Props<string>) {
  const handleValueChange = useCallback(
    (value: string | null, eventDetails: unknown) => {
      onValueChange?.(value as string, eventDetails as never);
    },
    [onValueChange]
  );

  return (
    <SelectPrimitive.Root
      data-slot="select"
      onValueChange={handleValueChange}
      {...props}
    />
  );
}

function SelectTrigger({
  children,
  className,
  ...props
}: SelectPrimitive.Trigger.Props) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "flex h-9 w-full min-w-0 items-center justify-between gap-2 whitespace-nowrap rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none transition-all focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50 data-[popup-open]:border-ring",
        className
      )}
      data-slot="select-trigger"
      {...props}
    >
      {children}
      <SelectPrimitive.Icon className="shrink-0 opacity-50">
        <ChevronDownIcon className="size-4" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectValue({
  children,
  className,
  placeholder,
  ...props
}: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      className={cn("truncate text-left", className)}
      data-slot="select-value"
      placeholder={placeholder ?? "Select…"}
      {...props}
    >
      {children}
    </SelectPrimitive.Value>
  );
}

function SelectContent({
  children,
  className,
  ...props
}: SelectPrimitive.Popup.Props) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        className="isolate z-50 outline-none"
        positionMethod="fixed"
        sideOffset={4}
      >
        <SelectPrimitive.Popup
          className={cn(
            "data-open:fade-in-0 data-open:zoom-in-95 data-closed:fade-out-0 data-closed:zoom-out-95 max-h-(--available-height) w-(--anchor-width) min-w-32 origin-(--transform-origin) overflow-y-auto overflow-x-hidden rounded-md bg-popover text-popover-foreground shadow-lg outline-none ring-1 ring-foreground/10 duration-150 data-closed:animate-out data-open:animate-in",
            className
          )}
          data-slot="select-content"
          {...props}
        >
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({
  children,
  className,
  ...props
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex w-full cursor-default select-none items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      data-slot="select-item"
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className="pointer-events-none absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  );
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
