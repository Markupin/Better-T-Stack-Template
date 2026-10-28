import { hasAnyRole, isSystemAdmin, type OrgRole } from "@better-t-stack-template/auth/roles";
import { member } from "@better-t-stack-template/db/schema/auth";
import { ORPCError, os } from "@orpc/server";
import { and, eq } from "drizzle-orm";

import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

/** Signed-in user required. */
const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({
    context: {
      session: context.session,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth);

/** System admin (Better Auth admin plugin role) required. */
export const adminProcedure = protectedProcedure.use(async ({ context, next }) => {
  if (!isSystemAdmin(context.session.user)) {
    throw new ORPCError("FORBIDDEN", { message: "Admin role required" });
  }
  return next();
});

/**
 * Active organization required: the caller must be a member of the session's
 * active organization (Better Auth organization plugin). Adds `organization`
 * ({ id, role, memberId }) to the context.
 */
export const orgProcedure = protectedProcedure.use(async ({ context, next }) => {
  const organizationId = context.session.session.activeOrganizationId;
  if (!organizationId) {
    throw new ORPCError("BAD_REQUEST", { message: "No active organization" });
  }
  const [membership] = await context.db
    .select({ id: member.id, role: member.role })
    .from(member)
    .where(
      and(eq(member.organizationId, organizationId), eq(member.userId, context.session.user.id)),
    )
    .limit(1);
  if (!membership) {
    throw new ORPCError("FORBIDDEN", { message: "Not a member of the active organization" });
  }
  return next({
    context: {
      organization: { id: organizationId, role: membership.role, memberId: membership.id },
    },
  });
});

/**
 * Restrict an org procedure to some organization roles.
 * Usage: `orgProcedure.use(requireOrgRole("owner", "admin")).handler(...)`
 */
export function requireOrgRole(...roles: OrgRole[]) {
  return o
    .$context<Context & { organization: { role: string } }>()
    .middleware(async ({ context, next }) => {
      if (!hasAnyRole(context.organization.role, roles)) {
        throw new ORPCError("FORBIDDEN", {
          message: `Organization role required: ${roles.join(" or ")}`,
        });
      }
      return next();
    });
}
