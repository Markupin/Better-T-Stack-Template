import { Separator } from "@better-t-stack-template/ui/components/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@better-t-stack-template/ui/components/sidebar";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { AppSidebar } from "@/components/app-sidebar";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { ModeToggle } from "@/components/mode-toggle";
import { getUser } from "@/functions/get-user";

/**
 * Protected layout. Every route under `_auth/` requires a signed-in user;
 * signed-out visitors are redirected to /login and sent back afterwards.
 * (The server still enforces auth on every API call; this is UX.)
 */
export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ location }) => {
    const session = await getUser();
    if (!session) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    return { session };
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  const { session } = Route.useRouteContext();

  return (
    <SidebarProvider>
      <AppSidebar user={session.user} />
      <SidebarInset>
        {session.session.impersonatedBy && <ImpersonationBanner name={session.user.name} />}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex-1" />
          <ModeToggle />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
