import { Button } from "@better-t-stack-template/ui/components/button";
import { useStore, type AnyFormApi } from "@tanstack/react-form";
import type { ReactNode } from "react";

/** Submit button that tracks a TanStack Form's submitting state. */
export function SubmitButton({
  form,
  children,
  className = "w-full",
}: {
  form: AnyFormApi;
  children: ReactNode;
  className?: string;
}) {
  const canSubmit = useStore(form.store, (s) => s.canSubmit);
  const isSubmitting = useStore(form.store, (s) => s.isSubmitting);
  return (
    <Button type="submit" className={className} disabled={!canSubmit || isSubmitting}>
      {isSubmitting ? "Please wait..." : children}
    </Button>
  );
}
