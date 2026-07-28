/**
 * Roles, the RBAC vocabulary.
 *
 * The single source of truth for who can be what. The route guard and any later
 * permission check read from here so "which roles exist" and "is this role
 * allowed" are answered in one place rather than re-listed per call site.
 */

export type Role = "admin" | "editor" | "operator" | "tamu";

/** Every role, most privileged first — for switchers and validation. */
export const ROLES: Role[] = ["admin", "editor", "operator", "tamu"];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  editor: "Editor",
  operator: "Operator",
  tamu: "Tamu",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as string[]).includes(value);
}

/**
 * Whether a role is cleared for an area.
 *
 * Membership, not hierarchy: an area names exactly the roles it admits, so
 * granting a lower role access to something never silently grants a higher one
 * elsewhere. A guard with an empty allow-list admits no one — fail closed.
 */
export function hasRequiredRole(role: Role, allow: readonly Role[]): boolean {
  return allow.includes(role);
}
