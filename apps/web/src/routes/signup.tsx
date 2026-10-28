import { useForm } from "@tanstack/react-form";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";

import { AuthLayout } from "@/components/auth-layout";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { safeRedirect } from "@/lib/redirect";

export const Route = createFileRoute("/signup")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({ meta: [{ title: "Sign up" }] }),
  component: SignUpPage,
});

function SignUpPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: { name: "", email: "", password: "" },
    validators: {
      onSubmit: z.object({
        name: z.string().trim().min(2, "Name must be at least 2 characters"),
        email: z.email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.signUp.email({
        ...value,
        // Where the verification link lands after verifying (auto sign-in).
        callbackURL: redirect ? safeRedirect(redirect) : "/verify-email",
      });
      if (error) {
        toast.error(authErrorMessage(error));
        return;
      }
      await navigate({ to: "/verify-email", search: { email: value.email } });
    },
  });

  return (
    <AuthLayout
      title="Create an account"
      description="Sign up with your email and a password."
      footer={
        <span className="text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" search={{ redirect }} className="text-foreground underline">
            Sign in
          </Link>
        </span>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
      >
        <form.Field name="name">
          {(field) => <FormField field={field} label="Name" autoComplete="name" />}
        </form.Field>
        <form.Field name="email">
          {(field) => <FormField field={field} label="Email" type="email" autoComplete="email" />}
        </form.Field>
        <form.Field name="password">
          {(field) => (
            <FormField field={field} label="Password" type="password" autoComplete="new-password" />
          )}
        </form.Field>
        <SubmitButton form={form}>Create account</SubmitButton>
      </form>
    </AuthLayout>
  );
}
