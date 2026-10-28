import { Badge } from "@better-t-stack-template/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@better-t-stack-template/ui/components/card";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";

import { FormField } from "@/components/form-field";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { authClient, authErrorMessage } from "@/lib/auth-client";

export const Route = createFileRoute("/_auth/settings")({
  head: () => ({ meta: [{ title: "Settings" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { session } = Route.useRouteContext();
  const router = useRouter();

  const profileForm = useForm({
    defaultValues: { name: session.user.name },
    validators: {
      onSubmit: z.object({ name: z.string().trim().min(2, "Name must be at least 2 characters") }),
    },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.updateUser({ name: value.name });
      if (error) {
        toast.error(authErrorMessage(error));
        return;
      }
      toast.success("Profile updated");
      await router.invalidate();
    },
  });

  const passwordForm = useForm({
    defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
    validators: {
      onSubmit: z
        .object({
          currentPassword: z.string().min(1, "Current password is required"),
          newPassword: z.string().min(8, "Password must be at least 8 characters"),
          confirm: z.string(),
        })
        .refine((v) => v.newPassword === v.confirm, {
          message: "Passwords do not match",
          path: ["confirm"],
        }),
    },
    onSubmit: async ({ value, formApi }) => {
      const { error } = await authClient.changePassword({
        currentPassword: value.currentPassword,
        newPassword: value.newPassword,
        revokeOtherSessions: true,
      });
      if (error) {
        toast.error(authErrorMessage(error));
        return;
      }
      toast.success("Password changed. Other sessions were signed out.");
      formApi.reset();
    },
  });

  return (
    <>
      <PageHeader title="Settings" description="Manage your profile and password." />
      <div className="grid max-w-2xl gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription className="flex items-center gap-2">
              {session.user.email}
              <Badge variant={session.user.emailVerified ? "secondary" : "destructive"}>
                {session.user.emailVerified ? "verified" : "unverified"}
              </Badge>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void profileForm.handleSubmit();
              }}
            >
              <profileForm.Field name="name">
                {(field) => <FormField field={field} label="Name" autoComplete="name" />}
              </profileForm.Field>
              <SubmitButton form={profileForm} className="">
                Save
              </SubmitButton>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>Changing your password signs out your other sessions.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void passwordForm.handleSubmit();
              }}
            >
              <passwordForm.Field name="currentPassword">
                {(field) => (
                  <FormField
                    field={field}
                    label="Current password"
                    type="password"
                    autoComplete="current-password"
                  />
                )}
              </passwordForm.Field>
              <passwordForm.Field name="newPassword">
                {(field) => (
                  <FormField
                    field={field}
                    label="New password"
                    type="password"
                    autoComplete="new-password"
                  />
                )}
              </passwordForm.Field>
              <passwordForm.Field name="confirm">
                {(field) => (
                  <FormField
                    field={field}
                    label="Confirm new password"
                    type="password"
                    autoComplete="new-password"
                  />
                )}
              </passwordForm.Field>
              <SubmitButton form={passwordForm} className="">
                Change password
              </SubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
