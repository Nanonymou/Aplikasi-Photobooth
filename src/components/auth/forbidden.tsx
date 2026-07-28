import Link from "next/link";

import { AccessDenied } from "@/components/auth/access-denied";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/auth/roles";

/**
 * The full-page access-denied host.
 *
 * Wraps the shared `AccessDenied` message in a centered, full-height page and
 * gives it the one safe way on — home. Used by the route guard, which passes the
 * roles an area admits and the visitor's own, and by the standalone `/dilarang`
 * page, which passes neither so the message stays general. No hooks, so a server
 * page can render it directly.
 */
export function Forbidden({
  allow,
  role,
}: {
  allow?: readonly Role[];
  role?: Role;
}) {
  return (
    <main className="bg-background flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <AccessDenied
        allow={allow}
        role={role}
        className="max-w-sm"
        action={
          <Button asChild size="sm">
            <Link href="/">Kembali ke beranda</Link>
          </Button>
        }
      />
    </main>
  );
}
