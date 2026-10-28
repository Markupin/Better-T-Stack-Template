import { ORG_ROLES, hasAnyRole, type OrgRole } from "@better-t-stack-template/auth/roles";
import { Badge } from "@better-t-stack-template/ui/components/badge";
import { Button } from "@better-t-stack-template/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@better-t-stack-template/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@better-t-stack-template/ui/components/table";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";

import { CreateOrganizationForm } from "@/components/create-organization-dialog";
import { FormField } from "@/components/form-field";
import Loader from "@/components/loader";
import { PageHeader } from "@/components/page-header";
import { RoleSelect } from "@/components/role-select";
import { SubmitButton } from "@/components/submit-button";
import { UserAvatar } from "@/components/user-avatar";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { useRefreshAfterOrgChange } from "@/lib/use-refresh";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_auth/organization")({
  head: () => ({ meta: [{ title: "Organization" }] }),
  component: OrganizationPage,
});

const INVITE_ROLES = ["member", "admin"] as const satisfies readonly OrgRole[];

function OrganizationPage() {
  const { session } = Route.useRouteContext();
  const { data: org, isPending } = authClient.useActiveOrganization();

  if (!session.session.activeOrganizationId) {
    return (
      <>
        <PageHeader
          title="Organization"
          description="Create an organization to collaborate with others."
        />
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Create organization</CardTitle>
            <CardDescription>You will be its owner and can invite members.</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateOrganizationForm />
          </CardContent>
        </Card>
      </>
    );
  }

  if (isPending || !org) return <Loader />;
  return <ActiveOrganization userId={session.user.id} />;
}

function ActiveOrganization({ userId }: { userId: string }) {
  const { data: org } = authClient.useActiveOrganization();
  // Role comes from the server (oRPC orgProcedure); Better Auth enforces it on every mutation.
  const current = useQuery(orpc.organization.current.queryOptions());
  const refresh = useRefreshAfterOrgChange();
  const navigate = useNavigate();
  const role = current.data?.role ?? "member";
  const canManage = hasAnyRole(role, ["owner", "admin"]);
  const isOwner = hasAnyRole(role, ["owner"]);
  const stats = useQuery({ ...orpc.organization.stats.queryOptions(), enabled: canManage });

  if (!org) return null;

  async function run(action: () => Promise<{ error: unknown }>, success: string) {
    const { error } = await action();
    if (error) {
      toast.error(authErrorMessage(error as { message?: string }));
      return false;
    }
    toast.success(success);
    await refresh();
    return true;
  }

  async function leave() {
    if (!org || !confirm(`Leave ${org.name}?`)) return;
    const ok = await run(
      () => authClient.organization.leave({ organizationId: org.id }),
      `You left ${org.name}`,
    );
    if (ok) await navigate({ to: "/dashboard" });
  }

  const pendingInvitations = org.invitations.filter((i) => i.status === "pending");

  return (
    <>
      <PageHeader
        title={org.name}
        description={
          <>
            Your role: <Badge variant="secondary">{role}</Badge>
            {stats.data && (
              <span className="ml-2">
                · {stats.data.members} members · {stats.data.pendingInvitations} pending invitations
              </span>
            )}
          </>
        }
        actions={
          <Button variant="destructive" onClick={leave}>
            Leave organization
          </Button>
        }
      />

      {canManage && <OrganizationSettings organizationId={org.id} name={org.name} />}

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {org.members.map((m) => {
                const self = m.userId === userId;
                // Only owners can touch owners; nobody edits themselves here.
                const editable = canManage && !self && (isOwner || m.role !== "owner");
                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserAvatar name={m.user.name} image={m.user.image} className="size-7" />
                        <div>
                          <div className="font-medium">
                            {m.user.name}{" "}
                            {self && <span className="text-muted-foreground">(you)</span>}
                          </div>
                          <div className="text-muted-foreground text-xs">{m.user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {editable ? (
                        <RoleSelect
                          value={m.role as OrgRole}
                          roles={isOwner ? ORG_ROLES : INVITE_ROLES}
                          onChange={(next) =>
                            run(
                              () =>
                                authClient.organization.updateMemberRole({
                                  memberId: m.id,
                                  role: next,
                                }),
                              `Role updated to ${next}`,
                            )
                          }
                        />
                      ) : (
                        <Badge variant="outline">{m.role}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editable && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (!confirm(`Remove ${m.user.name} from ${org.name}?`)) return;
                            void run(
                              () => authClient.organization.removeMember({ memberIdOrEmail: m.id }),
                              "Member removed",
                            );
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Invitations</CardTitle>
            <CardDescription>
              Invited users receive a link by email. Without an email provider the link is printed
              in the server log.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InviteForm />
            {pendingInvitations.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvitations.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>{inv.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{inv.role}</Badge>
                      </TableCell>
                      <TableCell>{new Date(inv.expiresAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            run(
                              () =>
                                authClient.organization.cancelInvitation({ invitationId: inv.id }),
                              "Invitation cancelled",
                            )
                          }
                        >
                          Cancel
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}

function OrganizationSettings({ organizationId, name }: { organizationId: string; name: string }) {
  const refresh = useRefreshAfterOrgChange();
  const form = useForm({
    defaultValues: { name },
    validators: {
      onSubmit: z.object({ name: z.string().trim().min(2, "Name must be at least 2 characters") }),
    },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.organization.update({
        organizationId,
        data: { name: value.name },
      });
      if (error) {
        toast.error(authErrorMessage(error));
        return;
      }
      toast.success("Organization updated");
      await refresh();
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex max-w-md items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <div className="flex-1">
            <form.Field name="name">
              {(field) => <FormField field={field} label="Organization name" />}
            </form.Field>
          </div>
          <SubmitButton form={form} className="">
            Save
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

function InviteForm() {
  const refresh = useRefreshAfterOrgChange();
  const [role, setRole] = useState<(typeof INVITE_ROLES)[number]>("member");
  const form = useForm({
    defaultValues: { email: "" },
    validators: { onSubmit: z.object({ email: z.email("Invalid email address") }) },
    onSubmit: async ({ value, formApi }) => {
      const { error } = await authClient.organization.inviteMember({ email: value.email, role });
      if (error) {
        toast.error(authErrorMessage(error));
        return;
      }
      toast.success(`Invitation sent to ${value.email}`);
      formApi.reset();
      await refresh();
    },
  });

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <div className="min-w-64 flex-1">
        <form.Field name="email">
          {(field) => (
            <FormField
              field={field}
              label="Invite by email"
              type="email"
              placeholder="name@example.com"
            />
          )}
        </form.Field>
      </div>
      <RoleSelect value={role} roles={INVITE_ROLES} onChange={setRole} />
      <SubmitButton form={form} className="">
        Send invite
      </SubmitButton>
    </form>
  );
}
