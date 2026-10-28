import { Alert, AlertDescription } from "@better-t-stack-template/ui/components/alert";
import { Button } from "@better-t-stack-template/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AuthLayout } from "@/components/auth-layout";
import Loader from "@/components/loader";
import { getUser } from "@/functions/get-user";
import { authClient, authErrorMessage } from "@/lib/auth-client";

export const Route = createFileRoute("/accept-invitation/$invitationId")({
  beforeLoad: async ({ location }) => {
    const session = await getUser();
    if (!session) throw redirect({ to: "/login", search: { redirect: location.href } });
    return { session };
  },
  head: () => ({ meta: [{ title: "Invitation" }] }),
  component: AcceptInvitationPage,
});

function AcceptInvitationPage() {
  const { invitationId } = Route.useParams();
  const { session } = Route.useRouteContext();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const invitation = useQuery({
    queryKey: ["invitation", invitationId],
    queryFn: async () => {
      const { data, error } = await authClient.organization.getInvitation({
        query: { id: invitationId },
      });
      if (error) throw new Error(authErrorMessage(error));
      return data;
    },
    retry: false,
  });

  async function accept() {
    setBusy(true);
    const { data, error } = await authClient.organization.acceptInvitation({ invitationId });
    if (error || !data) {
      setBusy(false);
      toast.error(authErrorMessage(error));
      return;
    }
    await authClient.organization.setActive({ organizationId: data.invitation.organizationId });
    toast.success("Invitation accepted");
    window.location.assign("/organization");
  }

  async function reject() {
    setBusy(true);
    const { error } = await authClient.organization.rejectInvitation({ invitationId });
    setBusy(false);
    if (error) {
      toast.error(authErrorMessage(error));
      return;
    }
    toast.success("Invitation declined");
    await navigate({ to: "/dashboard" });
  }

  return (
    <AuthLayout title="Organization invitation">
      {invitation.isPending ? (
        <Loader />
      ) : invitation.error || !invitation.data ? (
        <Alert variant="destructive">
          <AlertDescription>
            This invitation is invalid, expired, or addressed to a different email than{" "}
            {session.user.email}.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          <p className="text-sm">
            <strong>{invitation.data.inviterEmail}</strong> invited you to join{" "}
            <strong>{invitation.data.organizationName}</strong> as{" "}
            <strong>{invitation.data.role}</strong>.
          </p>
          <div className="flex gap-2">
            <Button className="flex-1" disabled={busy} onClick={accept}>
              Accept
            </Button>
            <Button className="flex-1" variant="outline" disabled={busy} onClick={reject}>
              Decline
            </Button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
