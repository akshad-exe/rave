import type { ChangeEvent, TextareaHTMLAttributes } from "react";
import { useCallback } from "react";
import { Input } from "./input";
import { Label } from "./label";
import { Textarea } from "./textarea";

interface FormFieldControls {
  errors: Array<{ message?: string } | undefined | string>;
  name: string;
  onBlur: () => void;
  onChange: (value: string | ((input: string) => string)) => void;
  value: string;
}

interface FormFieldProps {
  asTextarea?: boolean;
  controls: FormFieldControls;
  description?: string;
  label: string;
  textareaProps?: TextareaHTMLAttributes<HTMLTextAreaElement>;
  type?: string;
}

const toErrorMessage = (
  error: { message?: string } | undefined | string
): string | undefined => (typeof error === "string" ? error : error?.message);

export function FormField({
  controls,
  label,
  description,
  type,
  asTextarea = false,
  textareaProps,
}: FormFieldProps) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      controls.onChange(event.target.value);
    },
    [controls]
  );

  const errorMessage = controls.errors.find((e) => toErrorMessage(e));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-col gap-1">
        <Label htmlFor={controls.name}>{label}</Label>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </div>
      {asTextarea ? (
        <Textarea
          aria-describedby={errorMessage ? `${controls.name}-error` : undefined}
          aria-invalid={!!errorMessage}
          id={controls.name}
          name={controls.name}
          onBlur={controls.onBlur}
          onChange={handleChange}
          value={controls.value}
          {...textareaProps}
        />
      ) : (
        <Input
          aria-describedby={errorMessage ? `${controls.name}-error` : undefined}
          aria-invalid={!!errorMessage}
          id={controls.name}
          name={controls.name}
          onBlur={controls.onBlur}
          onChange={handleChange}
          type={type}
          value={controls.value}
        />
      )}
      {errorMessage && (
        <p
          className="flex items-center gap-1.5 text-error text-sm"
          id={`${controls.name}-error`}
          role="alert"
        >
          <svg
            aria-hidden="true"
            className="size-4"
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
          {toErrorMessage(errorMessage)}
        </p>
      )}
    </div>
  );
}
