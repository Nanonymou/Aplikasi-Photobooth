"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Forbidden } from "@/components/auth/forbidden";
import { useAccount } from "@/lib/auth/use-account";
import { hasRequiredRole, type Role } from "@/lib/auth/roles";

/**
 * A role gate for a route subtree.
 *
 * Renders its children only for an account whose role is in `allow`; anyone else
 * never sees the guarded UI. Three outcomes: no session yet (the hook's null,
 * covering both the server render and a signed-out user) shows a spinner and, if
 * it persists, sends the user to sign in; a signed-in account without the role
 * gets the shared "access denied" screen rather than a silent redirect, so the
 * block is legible; a cleared account gets through. This is the client half — the
 * real defense is the server checking the same role before it ever ships the page.
 */
export function RoleGuard({
  allow,
  children,
  redirectTo = "/masuk",
}: {
  allow: readonly Role[];
  children: ReactNode;
  redirectTo?: string;
}) {
  const profile = useAccount();
  const router = useRouter();

  // A session that never resolves means signed-out: send them to authenticate.
  useEffect(() => {
    if (profile !== null) return;
    const timer = setTimeout(() => router.replace(redirectTo), 2000);
    return () => clearTimeout(timer);
  }, [profile, router, redirectTo]);

  if (profile === null) {
    return (
      <main className="bg-background flex min-h-dvh flex-col items-center justify-center px-6 py-12 text-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </main>
    );
  }

  if (!hasRequiredRole(profile.role, allow)) {
    return <Forbidden allow={allow} role={profile.role} />;
  }

  return <>{children}</>;
}
