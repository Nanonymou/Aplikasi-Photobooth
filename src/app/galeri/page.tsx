import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { GalleryManager } from "@/components/gallery/gallery-manager";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { requireAccount } from "@/lib/auth/page-guard";

export const metadata: Metadata = {
  title: "Galeri Saya — FrameStudio AI",
};

/**
 * A regular user's personal gallery.
 *
 * Where an account holder manages what they have made — separate from the admin
 * console and the organizer surfaces. Gated to any signed-in account, since a
 * gallery is personal; no role is required, because this is the ordinary user's
 * home rather than a privileged area.
 */
export default async function GalleryPage() {
  await requireAccount();

  return (
    <div className="bg-background flex min-h-dvh flex-col">
      <AppHeader title="Galeri saya" />

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
  );
}
