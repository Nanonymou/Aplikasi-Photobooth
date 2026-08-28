import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AppHeader } from "@/components/layout/app-header";
import { ShowcaseFilters } from "@/components/showcase/showcase-filters";
import { ShowcaseResults } from "@/components/showcase/showcase-results";
import { Button } from "@/components/ui/button";
import { getOwnerId } from "@/lib/api/owner";
import { listSaved, listShowcase } from "@/lib/db/showcase";
import { parseCategory, parseSort } from "@/lib/showcase/feed";

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
 *
 * The filter and the ordering are read from the query string here rather than
 * held in the browser, so a filtered wall is a link that can be sent, the back
 * button undoes a choice, and the page still works before any JavaScript
 * arrives. An unrecognised value falls back rather than erroring: this is a URL
 * strangers type and edit.
 *
 * The wall is read from the database directly rather than through this app's own
 * HTTP endpoint. A server component fetching its own API is a round trip out to
 * the network and back into the same process; the endpoint stays for the clients
 * that genuinely are elsewhere.
 *
 * The visitor's owner id goes with the query so each card can say whether *they*
 * have liked it — a question a counter cannot answer, and one a signed-out
 * visitor is still entitled to have answered, since they can like things too.
 */
export default async function ShowcasePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const query = await searchParams;
  const category = parseCategory(query.kategori);
  const sort = parseSort(query.urut);
  const savedOnly = query.simpan === "1";

  const viewer = await getOwnerId();
  const page = await listShowcase({ category, sort, viewer });

  // The saved shelf is a different question — "what did I keep?" — so it is a
  // different read rather than a filter over the wall, which would only ever
  // see the page that happened to arrive.
  const items = savedOnly
    ? viewer
      ? await listSaved(viewer)
      : []
    : page.items;
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

        <ShowcaseFilters
          category={category}
          sort={sort}
          savedOnly={savedOnly}
          counts={page.counts}
          total={page.total}
        />

        <ShowcaseResults
          items={items}
          savedOnly={savedOnly}
          category={category}
        />
      </main>
    </div>
  );
}
