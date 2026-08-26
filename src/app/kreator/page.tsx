import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AppHeader } from "@/components/layout/app-header";
import { SalesDashboard } from "@/components/creator/sales-dashboard";
import { Button } from "@/components/ui/button";
import { requireAccount } from "@/lib/auth/page-guard";

export const metadata: Metadata = {
  title: "Dasbor Kreator — FrameStudio AI",
};

/**
 * A creator's sales history.
 *
 * The private half of the public showcase: the wall shows what somebody made,
 * this shows what it earned them. Gated to any signed-in account and no role —
 * publishing a template is something an ordinary user does, so the page that
 * reports on it cannot be an operator surface.
 */
export default async function CreatorPage() {
  await requireAccount();

  return (
    <div className="bg-background flex min-h-dvh flex-col">
      <AppHeader title="Dasbor kreator" />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight">
              Dasbor kreator
            </h1>
            <p className="text-muted-foreground text-sm">
              Penjualan template yang kamu publikasikan, dan kapan uangnya cair.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/jelajah">
              Lihat di galeri publik
              <ArrowRight />
            </Link>
          </Button>
        </div>

        <SalesDashboard />
      </main>
    </div>
  );
}
