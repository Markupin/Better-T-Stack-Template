import { Alert, AlertDescription } from "@better-t-stack-template/ui/components/alert";
import { Button } from "@better-t-stack-template/ui/components/button";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";

import { AuthLayout } from "@/components/auth-layout";
import { getUser } from "@/functions/get-user";
import { authClient, authErrorMessage } from "@/lib/auth-client";

export const Route = createFileRoute("/verify-email")({
  validateSearch: z.object({ email: z.string().optional(), error: z.string().optional() }),
  // The verification link redirects here; once verified (auto sign-in) go to the app.
  beforeLoad: async ({ search }) => {
    if (search.error) return;
    const session = await getUser();
    if (session?.user.emailVerified) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Verify your email" }] }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { email, error } = Route.useSearch();
  const [sending, setSending] = useState(false);

  async function resend() {
    if (!email) return;
    setSending(true);
    const { error: err } = await authClient.sendVerificationEmail({
      email,
      callbackURL: "/verify-email",
    });
    setSending(false);
    if (err) toast.error(authErrorMessage(err));
    else toast.success("Verification email sent");
  }

  return (
    <AuthLayout
      title="Verify your email"
      description={
        email ? (
          <>
            We sent a verification link to <strong>{email}</strong>. Open it to activate your
            account.
          </>
        ) : (
          "Open the verification link we sent to your email to activate your account."
        )
      }
      footer={
        <Link to="/login" className="text-muted-foreground underline">
          Back to sign in
        </Link>
      }
    >
      <div className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>This verification link is invalid or has expired.</AlertDescription>
          </Alert>
        )}
        {email && (
          <Button variant="outline" className="w-full" disabled={sending} onClick={resend}>
            {sending ? "Sending..." : "Resend verification email"}
          </Button>
        )}
      </div>
    </AuthLayout>
  );
}
