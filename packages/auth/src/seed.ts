import type { Database } from "@better-t-stack-template/db";
import { user } from "@better-t-stack-template/db/schema/auth";
import { eq } from "drizzle-orm";

import type { Auth } from "./index";
import { ADMIN_ROLE } from "./roles";

export type SeedAdminInput = { email: string; password: string; name: string };

/**
 * Idempotently ensure a system admin exists.
 * - New user: created through Better Auth (password hashed by Better Auth),
 *   role "admin", email marked verified.
 * - Existing user: promoted to admin and marked verified (password untouched).
 */
export async function seedAdmin(auth: Auth, db: Database, input: SeedAdminInput) {
  const email = input.email.trim().toLowerCase();
  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));

  if (!existing) {
    // Server-side call without headers: allowed by the admin plugin.
    const created = await auth.api.createUser({
      body: { email, password: input.password, name: input.name, role: ADMIN_ROLE },
    });
    await db.update(user).set({ emailVerified: true }).where(eq(user.id, created.user.id));
    return { id: created.user.id, created: true };
  }

  await db
    .update(user)
    .set({ role: ADMIN_ROLE, emailVerified: true })
    .where(eq(user.id, existing.id));
  return { id: existing.id, created: false };
}
