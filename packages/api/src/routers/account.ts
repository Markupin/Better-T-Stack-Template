import { isSystemAdmin } from "@better-t-stack-template/auth/roles";

import { protectedProcedure } from "../index";

export const accountRouter = {
  /** Current user plus derived flags the UI needs. */
  me: protectedProcedure.handler(({ context }) => {
    const { user, session } = context.session;
    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role ?? null },
      isAdmin: isSystemAdmin(user),
      activeOrganizationId: session.activeOrganizationId ?? null,
      impersonatedBy: session.impersonatedBy ?? null,
    };
  }),
};
