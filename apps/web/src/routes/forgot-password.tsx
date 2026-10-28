import { useForm } from "@tanstack/react-form";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";

import { AuthLayout } from "@/components/auth-layout";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { authClient, authErrorMessage } from "@/lib/auth-client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const form = useForm({
    defaultValues: { email: "" },
    validators: { onSubmit: z.object({ email: z.email("Invalid email address") }) },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.requestPasswordReset({
        email: value.email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(authErrorMessage(error));
        return;
      }
      setSent(true);
    },
  });

  return (
    <AuthLayout
      title="Forgot your password?"
      description={
        sent
          ? "If an account exists for that email, a reset link is on its way."
          : "Enter your email and we'll send you a link to reset your password."
      }
      footer={
        <Link to="/login" className="text-muted-foreground underline">
          Back to sign in
        </Link>
      }
    >
      {!sent && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field name="email">
            {(field) => <FormField field={field} label="Email" type="email" autoComplete="email" />}
          </form.Field>
          <SubmitButton form={form}>Send reset link</SubmitButton>
        </form>
      )}
    </AuthLayout>
  );
}
