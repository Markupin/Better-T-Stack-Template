import { organization, user } from "@better-t-stack-template/db/schema/auth";
import { count, eq } from "drizzle-orm";

import { adminProcedure } from "../index";

/**
 * System-admin-only procedures. User management itself (list, set role, ban,
 * impersonate, revoke sessions) is done through Better Auth's admin plugin
 * endpoints, which enforce the admin role server-side.
 */
export const adminRouter = {
  stats: adminProcedure.handler(async ({ context }) => {
    const [[users], [banned], [orgs]] = await Promise.all([
      context.db.select({ value: count() }).from(user),
      context.db.select({ value: count() }).from(user).where(eq(user.banned, true)),
      context.db.select({ value: count() }).from(organization),
    ]);
    return {
      users: users?.value ?? 0,
      bannedUsers: banned?.value ?? 0,
      organizations: orgs?.value ?? 0,
    };
  }),
};
