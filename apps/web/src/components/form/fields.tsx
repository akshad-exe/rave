import { Input } from "@rave/ui/components/input";
import { Label } from "@rave/ui/components/label";
import { Switch } from "@rave/ui/components/switch";
import { useId } from "react";

/**
 * Labelled form controls used by the settings and event forms.
 *
 * These lived inside the organizer settings route file, where they were four
 * generic inputs next to three unrelated CRUD panels. They have no knowledge of
 * events, so nothing about them belongs to that feature.
 *
 * Ids come from `useId` rather than being derived from the label text, so two
 * fields with similar labels cannot collide and a label edit cannot silently
 * break a `<label for>` association.
 */

interface BaseFieldProps {
  hint?: string;
  label: string;
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  maxLength,
  placeholder,
}: BaseFieldProps & {
  maxLength?: number;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  value: string;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label className="block text-xs" htmlFor={id}>
        {label}
      </Label>
      <Input
        id={id}
        maxLength={maxLength}
        onChange={onChange}
        placeholder={placeholder}
        value={value}
      />
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  hint,
}: BaseFieldProps & {
  max?: number;
  min?: number;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  value: number | "";
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label className="block text-xs" htmlFor={id}>
        {label}
      </Label>
      <Input
        id={id}
        max={max}
        min={min}
        onChange={onChange}
        type="number"
        value={value}
      />
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
}

/**
 * A `datetime-local` input. The value is the string the browser's control
 * understands (`YYYY-MM-DDTHH:mm`), not an ISO timestamp — passing the latter
 * makes the control render blank, because it wants a local time with no zone.
 */
export function DateField({
  label,
  value,
  onChange,
  hint,
}: BaseFieldProps & {
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  value: string;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label className="block text-xs" htmlFor={id}>
        {label}
      </Label>
      <Input id={id} onChange={onChange} type="datetime-local" value={value} />
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
}

export function ToggleField({
  label,
  hint,
  checked,
  onChange,
}: {
  checked: boolean;
  hint?: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-2.5">
      <Switch
        checked={checked}
        className="mt-0.5"
        id={id}
        onCheckedChange={onChange}
      />
      <label className="cursor-pointer" htmlFor={id}>
        <span className="block font-medium text-sm">{label}</span>
        {hint ? (
          <span className="block text-muted-foreground text-xs">{hint}</span>
        ) : null}
      </label>
    </div>
  );
}
