import { cn } from "@rave/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  InfoIcon,
  XCircleIcon,
} from "lucide-react";
import type * as React from "react";

const alertVariants = cva(
  "relative w-full gap-3 rounded-lg border p-4 [&>svg]:size-4 [&>svg]:shrink-0",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        default: "border-border bg-muted text-foreground",
        destructive: "border-error/30 bg-error/10 text-error",
        info: "border-info/30 bg-info/10 text-info",
        success: "border-success/30 bg-success/10 text-success",
        warning: "border-warning/30 bg-warning/10 text-warning",
      },
    },
  }
);

const alertIcons = {
  default: AlertCircleIcon,
  destructive: XCircleIcon,
  info: InfoIcon,
  success: CheckCircleIcon,
  warning: AlertCircleIcon,
} as const;

type AlertVariant = keyof typeof alertIcons;

interface AlertProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof alertVariants> {
  description?: string;
  title?: string;
}

function Alert({
  className,
  variant = "default",
  title,
  description,
  children,
  ...props
}: AlertProps) {
  const Icon = alertIcons[variant as AlertVariant] ?? AlertCircleIcon;
  return (
    <div
      className={cn(alertVariants({ variant }), className)}
      data-slot="alert"
      role="alert"
      {...props}
    >
      <Icon aria-hidden="true" className="text-current" />
      <div className="flex-1">
        {title ? <h5 className="font-medium text-sm">{title}</h5> : null}
        {description ? (
          <p className="text-sm opacity-90">{description}</p>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export { Alert, alertVariants };
