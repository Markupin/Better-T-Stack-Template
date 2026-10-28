import { Button } from "@better-t-stack-template/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@better-t-stack-template/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/page-header";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_auth/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { session } = Route.useRouteContext();
  const hasActiveOrg = Boolean(session.session.activeOrganizationId);
  const org = useQuery({ ...orpc.organization.current.queryOptions(), enabled: hasActiveOrg });

  return (
    <>
      <PageHeader title={`Welcome, ${session.user.name}`} description="This is your dashboard." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
            <CardDescription>
              {hasActiveOrg
                ? org.data
                  ? `${org.data.organization?.name} · your role: ${org.data.role}`
                  : "Loading..."
                : "You are not in an organization yet."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" render={<Link to="/organization" />}>
              {hasActiveOrg ? "Manage organization" : "Create an organization"}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>{session.user.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" render={<Link to="/settings" />}>
              Account settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
