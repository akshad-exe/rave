import { cn } from "@rave/ui/lib/utils";
import type * as React from "react";

function Avatar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full",
        className
      )}
      data-slot="avatar"
      {...props}
    />
  );
}

function AvatarImage({
  alt = "",
  className,
  ...props
}: React.ComponentProps<"img">) {
  return (
    <img
      alt={alt}
      className={cn("aspect-square h-full w-full object-cover", className)}
      data-slot="avatar-image"
      height={40}
      width={40}
      {...props}
    />
  );
}

function AvatarFallback({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex aspect-square h-full w-full items-center justify-center bg-muted font-medium text-muted-foreground",
        className
      )}
      data-slot="avatar-fallback"
      {...props}
    />
  );
}

export { Avatar, AvatarFallback, AvatarImage };
