import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GitBranch, Images, Ruler, Wand2 } from "lucide-react";

import { AppHeader } from "@/components/layout/app-header";
import { ShowcaseReactions } from "@/components/showcase/showcase-reactions";
import { ShowcaseGrid } from "@/components/showcase/showcase-grid";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/auth/initials";
import {
  CATEGORIES,
  formatCount,
  shapeLabel,
  showcaseItem,
  SHOWCASE_ITEMS,
} from "@/lib/showcase/feed";

/**
 * Every published design, known at build time.
 *
 * The feed is a compiled constant at this stage, so there is nothing to look up
 * per request. When it comes from the database these become the popular ones,
 * and the rest render on demand — the page does not change either way.
 */
export function generateStaticParams() {
  return SHOWCASE_ITEMS.map((item) => ({ id: item.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const item = showcaseItem((await params).id);
  if (!item) return { title: "Karya tidak ditemukan — FrameStudio AI" };

  return {
    title: `${item.title} oleh ${item.author} — FrameStudio AI`,
    description: `Template ${shapeLabel(item).toLowerCase()} ${item.width}×${item.height} px oleh ${item.author}. Remix jadi versimu sendiri.`,
  };
}

function categoryLabel(id: string): string {
  return CATEGORIES.find((category) => category.id === id)?.label ?? id;
}

/**
 * One published design, on its own page.
 *
 * The wall is for scanning; this is for deciding. So the preview is as large as
 * the design's own shape allows, the numbers are spelled out rather than
 * abbreviated into chips, and the one thing somebody came here to do — remix it
 * — is a button rather than a hover state.
 *
 * Public, like the wall it came from: this is the URL that gets pasted into a
 * group chat, and a sign-in wall on it would be a wall in front of the only page
 * that recruits anybody.
 */
export default async function ShowcaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const item = showcaseItem((await params).id);
  if (!item) notFound();

  // Same occasion, minus itself. A row of "more like this" is the only honest
  // recommendation a mock feed can make, and it is also the useful one: somebody
  // looking at a wedding card is usually shopping for a wedding.
  const related = SHOWCASE_ITEMS.filter(
    (candidate) =>
      candidate.category === item.category && candidate.id !== item.id,
  ).slice(0, 4);

  return (
    <div className="bg-background flex min-h-dvh flex-col">
      <AppHeader title="Jelajah karya" />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
          <Link href="/jelajah">
            <ArrowLeft />
            Semua karya
          </Link>
        </Button>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_20rem]">
          <div
            className="border-border flex items-center justify-center overflow-hidden rounded-xl border"
            style={{
              aspectRatio: `${item.width} / ${item.height}`,
              maxHeight: "70dvh",
              background: `linear-gradient(135deg, hsl(${item.hue} 70% 55% / 0.35), hsl(${(item.hue + 50) % 360} 70% 50% / 0.12))`,
            }}
          >
            <Images className="text-foreground/25 size-10" />
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-balance">
                {item.title}
              </h1>
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <span
                  aria-hidden="true"
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-medium"
                  style={{
                    backgroundColor: `hsl(${item.hue} 60% 50% / 0.18)`,
                    color: `hsl(${item.hue} 70% 45%)`,
                  }}
                >
                  {initials(item.author)}
                </span>
                {item.author} · {item.at}
              </div>
            </div>

            {item.remixOf && (
              <p className="text-muted-foreground flex items-start gap-2 text-xs leading-relaxed">
                <GitBranch className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  Remix dari{" "}
                  <Link
                    href={`/jelajah/${item.remixOf.id}`}
                    className="text-foreground underline-offset-4 hover:underline"
                  >
                    {item.remixOf.title}
                  </Link>{" "}
                  oleh {item.remixOf.author}.
                </span>
              </p>
            )}

            <Button asChild size="lg" className="w-full">
              <Link href={`/tamu?remix=${item.id}`}>
                <Wand2 />
                Remix desain ini
              </Link>
            </Button>

            <ShowcaseReactions item={item} />

            <dl className="border-border grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl border p-4 text-sm">
              <dt className="text-muted-foreground flex items-center gap-1.5">
                <Ruler className="size-3.5" />
                Ukuran
              </dt>
              <dd className="text-right tabular-nums">
                {item.width} × {item.height} px
              </dd>

              <dt className="text-muted-foreground">Orientasi</dt>
              <dd className="text-right">{shapeLabel(item)}</dd>

              <dt className="text-muted-foreground">Kategori</dt>
              <dd className="text-right">
                <Link
                  href={`/jelajah?kategori=${item.category}`}
                  className="underline-offset-4 hover:underline"
                >
                  {categoryLabel(item.category)}
                </Link>
              </dd>

              {/* No "Suka" row: the button above already carries that number,
                  and this one would be the count *without* your own vote — two
                  true numbers that look like a mistake. */}
              <dt className="text-muted-foreground flex items-center gap-1.5">
                <GitBranch className="size-3.5" />
                Remix
              </dt>
              <dd className="text-right tabular-nums">
                {formatCount(item.remixes)}
              </dd>
            </dl>

            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-xs"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">
              Karya lain di {categoryLabel(item.category)}
            </h2>
            <ShowcaseGrid items={related} />
          </section>
        )}
      </main>
    </div>
  );
}
