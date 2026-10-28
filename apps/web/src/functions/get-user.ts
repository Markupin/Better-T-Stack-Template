import { createServerFn } from "@tanstack/react-start";

import { authMiddleware } from "@/middleware/auth";

/**
 * Current session for route guards / SSR. The session token is stripped:
 * whatever this returns is serialized into the page, and the token must stay
 * in the HttpOnly cookie only.
 */
export const getUser = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    if (!context.session) return null;
    const { token: _token, ...session } = context.session.session;
    return { user: context.session.user, session };
  });
