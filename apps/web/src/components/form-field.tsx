import { Input } from "@rave/ui/components/input";
import { Label } from "@rave/ui/components/label";
import { Textarea } from "@rave/ui/components/textarea";
import type { AnyFormApi } from "@tanstack/react-form";
import type { ChangeEvent, ReactNode } from "react";
import { useCallback } from "react";

export interface FormFieldApi {
  errors: unknown[];
  name: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  value: string;
}

/**
 * Adapts TanStack Form v1's field-level API to the shape `FormField` renders.
 *
 * v1 has no `form.getFieldControls(name)`. The equivalents are `getFieldValue`,
 * `getFieldMeta` and `setFieldValue`, which is what this wires together.
 *
 * `onChange` is narrowed to a string because this control only ever renders a
 * text input or textarea. Array, boolean and enum fields are written by their
 * own child components straight through `form.setFieldValue`, so they pass
 * children to `FormField` instead.
 */
export function fieldControls(form: AnyFormApi, name: string): FormFieldApi {
  return {
    errors: form.getFieldMeta(name)?.errors ?? [],
    name,
    onBlur: () => {
      form.setFieldMeta(name, (previous) => ({
        ...previous,
        isTouched: true,
      }));
    },
    onChange: (value) => {
      form.setFieldValue(name, value);
    },
    value: String(form.getFieldValue(name) ?? ""),
  };
}

const toErrorMessage = (error: unknown): string | undefined => {
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    const { message } = error as { message?: unknown };
    return typeof message === "string" ? message : undefined;
  }
  return undefined;
};

interface FormFieldProps {
  asTextarea?: boolean;
  /** Bind a non-text control (Select, Checkbox, tag input) to the field. */
  children?: ReactNode;
  controls: FormFieldApi;
  description?: string;
  label: string;
  type?: string;
}

export function FormField({
  asTextarea,
  children,
  controls,
  description,
  label,
  type,
}: FormFieldProps) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      controls.onChange(event.target.value);
    },
    [controls]
  );

  const errorMessage = toErrorMessage(controls.errors[0]);
  const controlId = `field-${controls.name}`;
  const errorId = `${controlId}-error`;

  const sharedProps = {
    "aria-describedby": errorMessage ? errorId : undefined,
    "aria-invalid": Boolean(errorMessage),
    id: controlId,
    name: controls.name,
    onBlur: controls.onBlur,
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-col gap-1">
        <Label htmlFor={controlId}>{label}</Label>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </div>

      {children ??
        (asTextarea ? (
          <Textarea
            {...sharedProps}
            onChange={handleChange}
            rows={5}
            value={controls.value}
          />
        ) : (
          <Input
            {...sharedProps}
            onChange={handleChange}
            type={type}
            value={controls.value}
          />
        ))}

      {errorMessage ? (
        <p
          className="flex items-center gap-1.5 text-error text-sm"
          id={errorId}
          role="alert"
        >
          <svg
            aria-hidden="true"
            className="size-4 shrink-0"
            fill="none"
            focusable="false"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
