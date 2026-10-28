import { invitation, member, organization } from "@better-t-stack-template/db/schema/auth";
import { and, count, eq } from "drizzle-orm";

import { orgProcedure, requireOrgRole } from "../index";

/**
 * Organization-scoped procedures (active organization of the session).
 * Membership management (invite, accept, change role, remove, leave) is done
 * through Better Auth's organization plugin endpoints, which enforce
 * organization permissions server-side.
 */
export const organizationRouter = {
  /** Any member: the active organization and the caller's role in it. */
  current: orgProcedure.handler(async ({ context }) => {
    const [org] = await context.db
      .select({ id: organization.id, name: organization.name, slug: organization.slug })
      .from(organization)
      .where(eq(organization.id, context.organization.id))
      .limit(1);
    return { organization: org ?? null, role: context.organization.role };
  }),

  /** Owners and admins only: membership counts for the settings page. */
  stats: orgProcedure.use(requireOrgRole("owner", "admin")).handler(async ({ context }) => {
    const orgId = context.organization.id;
    const [[members], [pending]] = await Promise.all([
      context.db.select({ value: count() }).from(member).where(eq(member.organizationId, orgId)),
      context.db
        .select({ value: count() })
        .from(invitation)
        .where(and(eq(invitation.organizationId, orgId), eq(invitation.status, "pending"))),
    ]);
    return { members: members?.value ?? 0, pendingInvitations: pending?.value ?? 0 };
  }),
};
