"use client";

import { cn } from "@rave/ui/lib/utils";
import type * as React from "react";

interface SelectProps {
  children: React.ReactNode;
  className?: string;
}

function Select({ className, children }: SelectProps) {
  return (
    <div className={cn("w-full", className)} data-slot="select">
      {children}
    </div>
  );
}

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
  placeholder?: string;
}

function SelectTrigger({
  className,
  children,
  placeholder,
}: SelectTriggerProps) {
  return (
    <button
      aria-expanded="false"
      aria-haspopup="listbox"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none transition-all placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50",
        className
      )}
      data-slot="select-trigger"
      role="combobox"
      type="button"
    >
      {children ?? placeholder}
    </button>
  );
}

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

function SelectContent({ className, children }: SelectContentProps) {
  return (
    <div
      className={cn(
        "z-50 max-h-64 w-full rounded-md bg-popover text-popover-foreground shadow-md outline-none ring-1 ring-foreground/10",
        className
      )}
      data-slot="select-content"
    >
      {children}
    </div>
  );
}

interface SelectItemProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  value: string;
}

function SelectItem({
  className,
  value,
  disabled,
  children,
  ...props
}: SelectItemProps) {
  return (
    <button
      aria-disabled={disabled}
      aria-selected="false"
      className={cn(
        "relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      data-slot="select-item"
      data-value={value}
      disabled={disabled}
      role="option"
      type="button"
      value={value}
      {...props}
    >
      {children}
    </button>
  );
}

interface SelectValueProps {
  children: React.ReactNode;
  className?: string;
  placeholder?: string;
}

function SelectValue({ className, children, placeholder }: SelectValueProps) {
  return (
    <span className={cn("truncate", className)}>{children ?? placeholder}</span>
  );
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
