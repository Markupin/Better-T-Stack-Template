import { Input } from "@better-t-stack-template/ui/components/input";
import { Label } from "@better-t-stack-template/ui/components/label";
import type { AnyFieldApi } from "@tanstack/react-form";
import { useId, type ComponentProps } from "react";

/** Labelled input bound to a TanStack Form field, with validation errors. */
export function FormField({
  field,
  label,
  ...inputProps
}: { field: AnyFieldApi; label: string } & Omit<
  ComponentProps<typeof Input>,
  "id" | "name" | "value" | "onChange" | "onBlur"
>) {
  // Unique id so two forms on one page (e.g. a dialog) never share label targets.
  const id = `${useId()}-${field.name}`;
  const errors = field.state.meta.errors as Array<{ message?: string } | string | undefined>;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={field.name}
        value={field.state.value as string}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        aria-invalid={errors.length > 0 || undefined}
        {...inputProps}
      />
      {errors.map((error, i) => (
        <p key={i} className="text-destructive text-xs">
          {typeof error === "string" ? error : error?.message}
        </p>
      ))}
    </div>
  );
}
