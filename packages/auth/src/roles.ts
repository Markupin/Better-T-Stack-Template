/**
 * Role names provided by Better Auth's admin and organization plugins
 * (their default access-control roles). Shared by server guards and UI.
 */
export const SYSTEM_ROLES = ["admin", "user"] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];
export const ADMIN_ROLE: SystemRole = "admin";

export const ORG_ROLES = ["owner", "admin", "member"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

/** Better Auth stores multiple roles as a comma-separated string. */
export function parseRoles(role: string | null | undefined): string[] {
  if (!role) return [];
  return role
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
}

export function hasAnyRole(role: string | null | undefined, allowed: readonly string[]): boolean {
  return parseRoles(role).some((r) => allowed.includes(r));
}

export function isSystemAdmin(user: { role?: string | null } | null | undefined): boolean {
  return hasAnyRole(user?.role, [ADMIN_ROLE]);
}
