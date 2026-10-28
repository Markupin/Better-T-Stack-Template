import { isSystemAdmin } from "@better-t-stack-template/auth/roles";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Admin-only section. Non-admins are redirected to the dashboard.
 * Server-side, admin data comes from `adminProcedure` (oRPC) and Better Auth's
 * admin endpoints, which both reject non-admins regardless of this guard.
 */
export const Route = createFileRoute("/_auth/admin")({
  beforeLoad: ({ context }) => {
    if (!isSystemAdmin(context.session.user)) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: Outlet,
});
