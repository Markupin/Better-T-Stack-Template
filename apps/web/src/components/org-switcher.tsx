import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@better-t-stack-template/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@better-t-stack-template/ui/components/sidebar";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { authClient, authErrorMessage } from "@/lib/auth-client";
import { useRefreshAfterOrgChange } from "@/lib/use-refresh";

import { CreateOrganizationDialog } from "./create-organization-dialog";

export function OrgSwitcher() {
  const { data: organizations } = authClient.useListOrganizations();
  const { data: active } = authClient.useActiveOrganization();
  const refresh = useRefreshAfterOrgChange();
  const [createOpen, setCreateOpen] = useState(false);

  async function switchTo(organizationId: string) {
    const { error } = await authClient.organization.setActive({ organizationId });
    if (error) {
      toast.error(authErrorMessage(error));
      return;
    }
    await refresh();
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
              <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center text-xs font-semibold">
                {(active?.name ?? "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{active?.name ?? "No organization"}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {active ? active.slug : "Create or select one"}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Organizations</DropdownMenuLabel>
                {organizations?.map((org) => (
                  <DropdownMenuItem key={org.id} onClick={() => switchTo(org.id)}>
                    <span className="flex-1 truncate">{org.name}</span>
                    {org.id === active?.id && <Check className="size-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCreateOpen(true)}>
                <Plus />
                Create organization
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      <CreateOrganizationDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
