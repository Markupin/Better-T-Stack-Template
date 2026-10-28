import { useForm } from "@tanstack/react-form";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";

import { AuthLayout } from "@/components/auth-layout";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { safeRedirect } from "@/lib/redirect";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({ meta: [{ title: "Sign in" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: {
      onSubmit: z.object({
        email: z.email("Invalid email address"),
        password: z.string().min(1, "Password is required"),
      }),
    },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.signIn.email(value);
      if (error) {
        if (error.code === "EMAIL_NOT_VERIFIED") {
          toast.info("Please verify your email. We sent you a new link.");
          await navigate({ to: "/verify-email", search: { email: value.email } });
          return;
        }
        toast.error(authErrorMessage(error));
        return;
      }
      await navigate({ href: safeRedirect(redirect) });
    },
  });

  return (
    <AuthLayout
      title="Sign in"
      description="Welcome back. Sign in to your account."
      footer={
        <span className="text-muted-foreground">
          No account?{" "}
          <Link to="/signup" search={{ redirect }} className="text-foreground underline">
            Sign up
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
        <form.Field name="email">
          {(field) => <FormField field={field} label="Email" type="email" autoComplete="email" />}
        </form.Field>
        <form.Field name="password">
          {(field) => (
            <FormField
              field={field}
              label="Password"
              type="password"
              autoComplete="current-password"
            />
          )}
        </form.Field>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-muted-foreground text-xs underline">
            Forgot password?
          </Link>
        </div>
        <SubmitButton form={form}>Sign in</SubmitButton>
      </form>
    </AuthLayout>
  );
}
