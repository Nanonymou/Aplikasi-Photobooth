import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AppHeader } from "@/components/layout/app-header";
import { ShowcaseGrid } from "@/components/showcase/showcase-grid";
import { Button } from "@/components/ui/button";
import { SHOWCASE_ITEMS } from "@/lib/showcase/feed";

export const metadata: Metadata = {
  title: "Jelajah Karya — FrameStudio AI",
  description:
    "Lihat frame dan photostrip yang dibagikan komunitas FrameStudio, lalu buat versimu sendiri.",
};

/**
 * The public showcase.
 *
 * Deliberately not behind a sign-in: this is the page a stranger arrives on from
 * a shared link or a search, and asking them to make an account before they have
 * seen anything is asking them to leave. The account menu in the header is the
 * only nudge — everything on this page is readable signed out.
 */
export default function ShowcasePage() {
  return (
    <div className="bg-background flex min-h-dvh flex-col">
      <AppHeader title="Jelajah karya" />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight">
              Jelajah karya
            </h1>
            <p className="text-muted-foreground text-sm">
              Frame dan photostrip yang dibagikan komunitas. Pakai sebagai titik
              awal, lalu ubah sesukamu.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/tamu">
              Buat punyamu
              <ArrowRight />
            </Link>
          </Button>
        </div>

        <ShowcaseGrid items={SHOWCASE_ITEMS} />
      </main>
    </div>
  );
}
