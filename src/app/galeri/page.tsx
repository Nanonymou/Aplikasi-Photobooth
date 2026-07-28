import type { Metadata } from "next";
import Link from "next/link";
import { Aperture, Plus } from "lucide-react";

import { AccountMenu } from "@/components/auth/account-menu";
import { RoleGuard } from "@/components/auth/role-guard";
import { GalleryManager } from "@/components/gallery/gallery-manager";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Galeri Saya — FrameStudio AI",
};

/**
 * A regular user's personal gallery.
 *
 * Where an account holder manages what they have made — separate from the admin
 * console and the organizer surfaces. Gated to any signed-in account (a
 * signed-out visitor is sent to log in), since a gallery is personal; every role
 * is admitted because this is the ordinary user's home, not a privileged area.
 */
export default function GalleryPage() {
  return (
    <RoleGuard allow={["admin", "editor", "operator", "tamu"]}>
      <div className="bg-background flex min-h-dvh flex-col">
        <header className="bg-card border-border flex h-14 shrink-0 items-center gap-3 border-b px-4">
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
          <span className="text-muted-foreground text-sm font-medium">
            Galeri saya
          </span>
          <div className="ml-auto">
            <AccountMenu />
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold tracking-tight">
                Galeri saya
              </h1>
              <p className="text-muted-foreground text-sm">
                Semua desain yang kamu buat, tersimpan di akunmu.
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/editor">
                <Plus />
                Desain baru
              </Link>
            </Button>
          </div>

          <GalleryManager />
        </main>
      </div>
    </RoleGuard>
  );
}
