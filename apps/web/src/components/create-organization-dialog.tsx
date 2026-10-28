import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@better-t-stack-template/ui/components/dialog";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import z from "zod";

import { authClient, authErrorMessage } from "@/lib/auth-client";
import { useRefreshAfterOrgChange } from "@/lib/use-refresh";

import { FormField } from "./form-field";
import { SubmitButton } from "./submit-button";

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function CreateOrganizationForm({ onCreated }: { onCreated?: () => void }) {
  const refresh = useRefreshAfterOrgChange();
  const form = useForm({
    defaultValues: { name: "", slug: "" },
    validators: {
      onSubmit: z.object({
        name: z.string().trim().min(2, "Name must be at least 2 characters"),
        slug: z
          .string()
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only")
          .min(2, "Slug must be at least 2 characters"),
      }),
    },
    onSubmit: async ({ value }) => {
      const { data, error } = await authClient.organization.create(value);
      if (error || !data) {
        toast.error(authErrorMessage(error));
        return;
      }
      await authClient.organization.setActive({ organizationId: data.id });
      toast.success(`Created ${data.name}`);
      await refresh();
      onCreated?.();
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field
        name="name"
        listeners={{
          onChange: ({ value }) => {
            if (!form.getFieldMeta("slug")?.isDirty) form.setFieldValue("slug", slugify(value));
          },
        }}
      >
        {(field) => <FormField field={field} label="Name" placeholder="Acme Inc." />}
      </form.Field>
      <form.Field name="slug">
        {(field) => <FormField field={field} label="Slug" placeholder="acme" />}
      </form.Field>
      <SubmitButton form={form}>Create organization</SubmitButton>
    </form>
  );
}

export function CreateOrganizationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create organization</DialogTitle>
          <DialogDescription>You will be the owner of the new organization.</DialogDescription>
        </DialogHeader>
        <CreateOrganizationForm onCreated={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
