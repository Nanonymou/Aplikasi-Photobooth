import Link from "next/link";
import { ShieldX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";

/**
 * The access-denied screen.
 *
 * One place the app says "not you" — shared by the route guard, which passes the
 * roles an area admits and the visitor's own, and by the standalone `/dilarang`
 * page, which has neither and speaks generally. No hooks, so a server page can
 * render it directly. It explains rather than bounces — a silent redirect leaves
 * a user guessing why a link went nowhere — and offers the one safe way on: home.
 */
export function Forbidden({
  allow,
  role,
}: {
  allow?: readonly Role[];
  role?: Role;
}) {
  const allowedLabels = allow?.map((r) => ROLE_LABELS[r]).join(", ");

  return (
    <main className="bg-background flex min-h-dvh flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex max-w-sm flex-col items-center gap-4">
        <span className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-full">
          <ShieldX className="size-6" />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold tracking-tight">Akses ditolak</h1>
          <p className="text-muted-foreground text-sm text-pretty">
            {allowedLabels ? (
              <>
                Halaman ini hanya untuk peran {allowedLabels}.
                {role && <> Akunmu masuk sebagai {ROLE_LABELS[role]}.</>}
              </>
            ) : (
              "Kamu tidak punya akses ke halaman ini."
            )}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/">Kembali ke beranda</Link>
        </Button>
      </div>
    </main>
  );
}
