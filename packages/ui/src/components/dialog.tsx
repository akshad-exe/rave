"use client";

import type { DialogRootProps } from "@base-ui/react/dialog";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "@rave/ui/lib/utils";
import { XIcon } from "lucide-react";
import type * as React from "react";

/**
 * Wraps `@base-ui/react/dialog` 1.8.
 *
 * Three things differ from older base-ui releases and from the Radix shadcn
 * recipe this component was originally written against:
 *   - `Dialog.Overlay` is now `Dialog.Backdrop`, and `Dialog.Content` is now
 *     `Dialog.Popup`.
 *   - open/closed styling keys off `data-open` / `data-closed`, not
 *     `data-[state=open]` / `data-[state=closed]`.
 *   - `Dialog.Root` is a headless state provider: it renders no element, so it
 *     accepts neither `className` nor `data-slot`. Styling belongs on
 *     `DialogContent`, which renders the popup. For the same reason its props
 *     come from `DialogRootProps` rather than
 *     `React.ComponentProps<typeof DialogPrimitive.Root>`, which erases to
 *     `Props<unknown>`.
 *
 * The remaining parts are read with `React.ComponentProps<typeof …>` to match
 * `progress.tsx` and `dropdown-menu.tsx`.
 */
function Dialog(props: DialogRootProps) {
  return <DialogPrimitive.Root {...props} />;
}

function DialogTrigger({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return (
    <DialogPrimitive.Trigger
      className={cn(className)}
      data-slot="dialog-trigger"
      {...props}
    />
  );
}

function DialogPortal({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return (
    <DialogPrimitive.Portal
      className={cn(className)}
      data-slot="dialog-portal"
      {...props}
    />
  );
}

function DialogClose({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return (
    <DialogPrimitive.Close
      className={cn(
        "absolute top-4 right-4 flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
        className
      )}
      data-slot="dialog-close"
      {...props}
    >
      {children ?? (
        <>
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </>
      )}
    </DialogPrimitive.Close>
  );
}

/** Exported as `DialogOverlay` to keep the shadcn component surface stable. */
function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Backdrop>) {
  return (
    <DialogPrimitive.Backdrop
      className={cn(
        "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-150 data-closed:opacity-0 data-open:opacity-100",
        className
      )}
      data-slot="dialog-overlay"
      {...props}
    />
  );
}

/**
 * Owns its own portal, backdrop and popup so callers only need
 * `<DialogContent>`; base-ui applies `aria-modal` and focus trapping to
 * `Dialog.Popup`.
 */
function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Popup>) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        className={cn(
          "data-closed:fade-out-0 data-closed:zoom-out-95 data-open:fade-in-0 data-open:zoom-in-95 fixed top-[50%] left-[50%] z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-background p-6 shadow-xl outline-none ring-1 ring-border duration-150 data-closed:animate-out data-open:animate-in sm:max-w-xl",
          className
        )}
        data-slot="dialog-content"
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      data-slot="dialog-header"
      {...props}
    />
  );
}

/** Renders the base-ui `Title` so the popup gets an accessible name. */
function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn(
        "font-display font-semibold text-foreground text-lg",
        className
      )}
      data-slot="dialog-title"
      {...props}
    />
  );
}

/** Renders the base-ui `Description` so the popup gets a description. */
function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="dialog-description"
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      data-slot="dialog-footer"
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
