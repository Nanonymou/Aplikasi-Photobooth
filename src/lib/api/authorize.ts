import "server-only";

import { getAccountId } from "@/lib/api/account";
import { jsonError } from "@/lib/api/http";
import {
  permissionsForRole,
  type AppPermission,
} from "@/lib/db/role-permissions";
import { getUserProfile, type UserProfile } from "@/lib/db/user-profiles";

/**
 * Role verification for anything the server guards.
 *
 * The client already refuses to *show* what a role cannot reach (RoleGuard,
 * RoleGate). That is a courtesy to the user, not a boundary: it runs on the
 * visitor's own machine, and anyone can call an endpoint directly. This is the
 * boundary — the same policy, decided where it cannot be edited.
 *
 * A viewer is resolved once and carries its permissions with it, so a handler
 * that checks two things does not ask the database twice.
 */

export interface Viewer {
  profile: UserProfile;
  permissions: AppPermission[];
  can: (permission: AppPermission) => boolean;
}

/** The signed-in viewer, or null when there is no live session. */
export async function getViewer(): Promise<Viewer | null> {
  const accountId = await getAccountId();
  if (!accountId) return null;

  const profile = await getUserProfile(accountId);
  // A live session pointing at a missing profile means the account was removed
  // while the session lived. Treating that as "signed out" is the safe reading.
  if (!profile) return null;

  const permissions = await permissionsForRole(profile.role);
  return {
    profile,
    permissions,
    can: (permission) => permissions.includes(permission),
  };
}

/**
 * The two ways a guarded request can be turned away, kept distinct on purpose.
 *
 * 401 says "I do not know who you are" — a client should offer to sign in. 403
 * says "I know exactly who you are, and no" — signing in again will not help.
 * Collapsing them into one status sends users round a login loop that can never
 * succeed.
 */
export type AuthorizationFailure = { response: Response };

export function isFailure(
  result: Viewer | AuthorizationFailure,
): result is AuthorizationFailure {
  return "response" in result;
}

/**
 * Requires a permission, returning either the viewer or the response to send.
 *
 * Returns rather than throws: a route handler's job is to produce a Response,
 * and an exception for an expected outcome — a guest opening an admin URL — puts
 * ordinary traffic through the error path and the server logs.
 */
export async function requirePermission(
  permission: AppPermission,
): Promise<Viewer | AuthorizationFailure> {
  const viewer = await getViewer();

  if (!viewer) {
    return { response: jsonError(401, "Masuk dulu untuk melanjutkan.") };
  }

  if (!viewer.can(permission)) {
    return {
      response: jsonError(403, "Akunmu tidak punya akses ke bagian ini."),
    };
  }

  return viewer;
}

/**
 * Wraps a route handler so the guard cannot be forgotten.
 *
 * The failure path is the default here: a handler only runs once the permission
 * has been established, and it receives the viewer it was checked against. That
 * is the difference between a guard you must remember to call and one you cannot
 * omit — and forgetting is exactly how an admin endpoint ends up open.
 */
export function withPermission<Args extends unknown[]>(
  permission: AppPermission,
  handler: (viewer: Viewer, ...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    const result = await requirePermission(permission);
    if (isFailure(result)) return result.response;
    return handler(result, ...args);
  };
}
