import { Alert, AlertDescription } from "@better-t-stack-template/ui/components/alert";
import { useForm } from "@tanstack/react-form";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";

import { AuthLayout } from "@/components/auth-layout";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { authClient, authErrorMessage } from "@/lib/auth-client";

export const Route = createFileRoute("/reset-password")({
  validateSearch: z.object({ token: z.string().optional(), error: z.string().optional() }),
  head: () => ({ meta: [{ title: "Reset password" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token, error } = Route.useSearch();
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: { password: "", confirm: "" },
    validators: {
      onSubmit: z
        .object({
          password: z.string().min(8, "Password must be at least 8 characters"),
          confirm: z.string(),
        })
        .refine((v) => v.password === v.confirm, {
          message: "Passwords do not match",
          path: ["confirm"],
        }),
    },
    onSubmit: async ({ value }) => {
      if (!token) return;
      const { error: err } = await authClient.resetPassword({ newPassword: value.password, token });
      if (err) {
        toast.error(authErrorMessage(err));
        return;
      }
      toast.success("Password updated. Please sign in.");
      await navigate({ to: "/login" });
    },
  });

  const invalid = Boolean(error) || !token;

  return (
    <AuthLayout
      title="Choose a new password"
      footer={
        <Link to="/login" className="text-muted-foreground underline">
          Back to sign in
        </Link>
      }
    >
      {invalid ? (
        <Alert variant="destructive">
          <AlertDescription>
            This reset link is invalid or has expired.{" "}
            <Link to="/forgot-password" className="underline">
              Request a new one
            </Link>
            .
          </AlertDescription>
        </Alert>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field name="password">
            {(field) => (
              <FormField
                field={field}
                label="New password"
                type="password"
                autoComplete="new-password"
              />
            )}
          </form.Field>
          <form.Field name="confirm">
            {(field) => (
              <FormField
                field={field}
                label="Confirm password"
                type="password"
                autoComplete="new-password"
              />
            )}
          </form.Field>
          <SubmitButton form={form}>Update password</SubmitButton>
        </form>
      )}
    </AuthLayout>
  );
}
