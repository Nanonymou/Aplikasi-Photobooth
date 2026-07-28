"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ShieldX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAccount } from "@/lib/auth/use-account";
import { hasRequiredRole, ROLE_LABELS, type Role } from "@/lib/auth/roles";

function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="bg-background flex min-h-dvh flex-col items-center justify-center px-6 py-12 text-center">
      {children}
    </main>
  );
}

/**
 * A role gate for a route subtree.
 *
 * Renders its children only for an account whose role is in `allow`; anyone else
 * never sees the guarded UI. Three outcomes: no session yet (the hook's null,
 * covering both the server render and a signed-out user) shows a spinner and, if
 * it persists, sends the user to sign in; a signed-in account without the role
 * gets a plain "access denied" rather than a silent redirect, so the block is
 * legible; a cleared account gets through. This is the client half — the real
 * defense is the server checking the same role before it ever ships the page.
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
      <Centered>
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </Centered>
    );
  }

  if (!hasRequiredRole(profile.role, allow)) {
    const allowedLabels = allow.map((role) => ROLE_LABELS[role]).join(", ");
    return (
      <Centered>
        <div className="flex max-w-sm flex-col items-center gap-4">
          <span className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-full">
            <ShieldX className="size-6" />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-semibold tracking-tight">
              Akses ditolak
            </h1>
            <p className="text-muted-foreground text-sm text-pretty">
              Halaman ini hanya untuk peran {allowedLabels || "tertentu"}. Akunmu
              masuk sebagai {ROLE_LABELS[profile.role]}.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/">Kembali ke beranda</Link>
          </Button>
        </div>
      </Centered>
    );
  }

  return <>{children}</>;
}
