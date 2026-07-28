import Link from "next/link";
import { Aperture, ShieldCheck } from "lucide-react";

import { AccountMenu } from "@/components/auth/account-menu";
import { Separator } from "@/components/ui/separator";

/**
 * The admin area's top bar.
 *
 * Names where you are — this is the console, not the editor — and who you are,
 * with the same account menu the workspace uses so signing out works the same
 * everywhere. The role badge is the one admin-only note: a standing reminder that
 * this surface is gated, which the RBAC guard (a later task) will enforce for
 * real. The brand mark links home so the console is never a dead end.
 */
export function AdminTopbar() {
  return (
    <header className="bg-card border-border sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b px-4">
      <Link
        href="/"
        className="focus-visible:ring-ring/50 flex items-center gap-2 rounded-md outline-none focus-visible:ring-[3px]"
      >
        <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
          <Aperture className="size-4.5" />
        </span>
        <span className="hidden text-sm font-semibold tracking-tight sm:inline">
          FrameStudio
        </span>
      </Link>

      <Separator orientation="vertical" className="h-6" />

      <span className="text-muted-foreground text-sm font-medium">Konsol Admin</span>

      <div className="ml-auto flex items-center gap-3">
        <span className="border-border text-muted-foreground hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium sm:inline-flex">
          <ShieldCheck className="text-primary size-3.5" />
          Admin
        </span>
        <AccountMenu />
      </div>
    </header>
  );
}
