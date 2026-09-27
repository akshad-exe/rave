import { Input } from "@rave/ui/components/input";
import { Label } from "@rave/ui/components/label";
import type { ChangeEvent } from "react";
import { useCallback } from "react";

interface FormFieldControls {
  errors: Array<{ message?: string } | undefined | string>;
  name: string;
  onBlur: () => void;
  onChange: (value: string | ((input: string) => string)) => void;
  value: string;
}

interface FormFieldProps {
  controls: FormFieldControls;
  label: string;
  type?: string;
}

const toErrorMessage = (
  error: { message?: string } | undefined | string
): string | undefined => (typeof error === "string" ? error : error?.message);

export function FormField({ controls, label, type }: FormFieldProps) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      controls.onChange(event.target.value);
    },
    [controls]
  );

  return (
    <div className="space-y-2">
      <Label htmlFor={controls.name}>{label}</Label>
      <Input
        id={controls.name}
        name={controls.name}
        onBlur={controls.onBlur}
        onChange={handleChange}
        type={type}
        value={controls.value}
      />
      {controls.errors.map((error, index) => (
        <p className="text-red-500" key={toErrorMessage(error) ?? index}>
          {toErrorMessage(error)}
        </p>
      ))}
    </div>
  );
}
