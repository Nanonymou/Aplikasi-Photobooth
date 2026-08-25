"use client";

import type { ReactNode } from "react";

import { hasRequiredRole, type Role } from "@/lib/auth/roles";
import { useRole } from "@/lib/auth/use-account";

/**
 * Inline role gate for a fragment of UI.
 *
 * The quiet counterpart to the server-side page guards: where they own a whole
 * route and
 * announces a denial, this just decides whether a piece of the page exists at
 * all — a nav link, a menu entry, a button — rendering nothing (or a `fallback`)
 * when the role does not qualify. Used to compose navigation that differs by
 * role without branching every call site by hand. While the session is still
 * resolving there is no role, so the gated UI stays hidden rather than flashing.
 */
export function RoleGate({
  allow,
  children,
  fallback = null,
}: {
  allow: readonly Role[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const role = useRole();
  if (role === null || !hasRequiredRole(role, allow)) return <>{fallback}</>;
  return <>{children}</>;
}
