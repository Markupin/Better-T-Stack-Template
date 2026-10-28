import { SYSTEM_ROLES, type SystemRole } from "@better-t-stack-template/auth/roles";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@better-t-stack-template/ui/components/dropdown-menu";
import { Input } from "@better-t-stack-template/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@better-t-stack-template/ui/components/table";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";

import { PageHeader } from "@/components/page-header";
import { RoleSelect } from "@/components/role-select";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/_auth/admin/")({
  validateSearch: z.object({
    q: z.string().optional(),
    page: z.number().int().min(1).optional(),
  }),
  head: () => ({ meta: [{ title: "Admin · Users" }] }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { session } = Route.useRouteContext();
  const { q = "", page = 1 } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const [search, setSearch] = useState(q);

  const stats = useQuery(orpc.admin.stats.queryOptions());
  const users = useQuery({
    queryKey: ["admin", "users", q, page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await authClient.admin.listUsers({
        query: {
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
          sortBy: "createdAt",
          sortDirection: "desc",
          ...(q
            ? {
                searchValue: q,
                searchField: q.includes("@") ? "email" : "name",
                searchOperator: "contains",
              }
            : {}),
        },
      });
      if (error) throw new Error(authErrorMessage(error));
      return data;
    },
  });

  const total = users.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function run(action: () => Promise<{ error: unknown }>, success: string) {
    const { error } = await action();
    if (error) {
      toast.error(authErrorMessage(error as { message?: string }));
      return false;
    }
    toast.success(success);
    await queryClient.invalidateQueries();
    return true;
  }

  async function impersonate(userId: string) {
    const { error } = await authClient.admin.impersonateUser({ userId });
    if (error) {
      toast.error(authErrorMessage(error));
      return;
    }
    window.location.assign("/dashboard");
  }

  return (
    <>
      <PageHeader title="Users" description="Manage all users of the system." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Users" value={stats.data?.users} />
        <StatCard label="Banned" value={stats.data?.bannedUsers} />
        <StatCard label="Organizations" value={stats.data?.organizations} />
      </div>
      <Card>
        <CardHeader>
          <form
            className="flex max-w-md gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void navigate({ search: { q: search.trim() || undefined, page: undefined } });
            }}
          >
            <Input
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.data?.users.map((u) => {
                const self = u.id === session.user.id;
                const role = (u.role ?? "user") as SystemRole;
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">
                        {u.name} {self && <span className="text-muted-foreground">(you)</span>}
                      </div>
                      <div className="text-muted-foreground text-xs">{u.email}</div>
                    </TableCell>
                    <TableCell>
                      <RoleSelect
                        value={SYSTEM_ROLES.includes(role) ? role : "user"}
                        roles={SYSTEM_ROLES}
                        disabled={self}
                        onChange={(next) =>
                          run(
                            () => authClient.admin.setRole({ userId: u.id, role: next }),
                            `Role set to ${next}`,
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="space-x-1">
                      {u.banned ? (
                        <Badge variant="destructive">banned</Badge>
                      ) : (
                        <Badge variant="secondary">active</Badge>
                      )}
                      {!u.emailVerified && <Badge variant="outline">unverified</Badge>}
                    </TableCell>
                    <TableCell>{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      {!self && (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={<Button size="icon-sm" variant="ghost" aria-label="Actions" />}
                          >
                            <MoreHorizontal />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-44">
                            <DropdownMenuItem
                              disabled={Boolean(u.banned)}
                              onClick={() => impersonate(u.id)}
                            >
                              Impersonate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                run(
                                  () => authClient.admin.revokeUserSessions({ userId: u.id }),
                                  "Sessions revoked",
                                )
                              }
                            >
                              Revoke sessions
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {u.banned ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  run(
                                    () => authClient.admin.unbanUser({ userId: u.id }),
                                    "User unbanned",
                                  )
                                }
                              >
                                Unban
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => {
                                  const banReason = prompt(`Ban ${u.email}? Optional reason:`);
                                  if (banReason === null) return;
                                  void run(
                                    () =>
                                      authClient.admin.banUser({
                                        userId: u.id,
                                        banReason: banReason || undefined,
                                      }),
                                    "User banned",
                                  );
                                }}
                              >
                                Ban
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="text-muted-foreground mt-4 flex items-center justify-between text-xs">
            <span>
              {total} users · page {page} of {pageCount}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => navigate({ search: (s) => ({ ...s, page: page - 1 }) })}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= pageCount}
                onClick={() => navigate({ search: (s) => ({ ...s, page: page + 1 }) })}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number | undefined }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value ?? "–"}</CardTitle>
      </CardHeader>
    </Card>
  );
}
