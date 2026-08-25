"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, Compass, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  categoryCounts,
  HELP_ARTICLES,
  HELP_CATEGORIES,
  searchArticles,
  type HelpArticle,
  type HelpCategory,
} from "@/lib/help/articles";
import { cn } from "@/lib/utils";

function Article({
  article,
  open,
}: {
  article: HelpArticle;
  /** Searching opens what it found, so the match is visible without a second click. */
  open: boolean;
}) {
  return (
    // `details` rather than a hook: opening one short answer is exactly what the
    // element does, it works before any JavaScript arrives, and the keyboard and
    // screen-reader behaviour come for free.
    //
    // Keyed by the search in the parent, so a new search re-mounts these and the
    // `open` default applies again instead of being frozen at first render.
    <details className="group" open={open}>
      <summary className="hover:bg-accent/40 focus-visible:ring-ring/50 flex cursor-pointer list-none items-start gap-3 px-4 py-3 outline-none focus-visible:ring-[3px] focus-visible:ring-inset">
        <ChevronDown
          className="text-muted-foreground mt-0.5 size-4 shrink-0 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{article.title}</p>
          <p className="text-muted-foreground text-sm text-pretty">
            {article.summary}
          </p>
        </div>
      </summary>

      <div className="text-muted-foreground flex flex-col gap-2 px-4 pt-1 pb-4 pl-11 text-sm leading-relaxed">
        {article.body.map((paragraph) => (
          <p key={paragraph} className="text-pretty">
            {paragraph}
          </p>
        ))}
      </div>
    </details>
  );
}

/**
 * The help centre: search, categories, and the articles themselves.
 *
 * Two ways in, because people arrive knowing two different amounts. Somebody who
 * knows the word — "kode", "watermark", "kedaluwarsa" — types it; somebody who
 * only knows the area picks a category. They compose: a search inside a category
 * narrows further rather than replacing it.
 *
 * Searching reads the whole article, not just its title, because the answer to
 * "kode" lives in a paragraph. That is also why a match opens itself: an article
 * that appeared for a word the summary never mentions looks like a mistake until
 * you can see the sentence that put it there.
 *
 * Grouping only survives while it earns its place. With a search running, three
 * headings above one result each is filing, not helping, so the results become a
 * single list.
 */
export function HelpArticles() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<HelpCategory | null>(null);

  const counts = useMemo(() => categoryCounts(), []);
  const searching = query.trim().length > 0;

  const results = useMemo(
    () => searchArticles({ query, category: category ?? undefined }),
    [query, category],
  );

  const groups = useMemo(
    () =>
      HELP_CATEGORIES.map((entry) => ({
        ...entry,
        articles: results.filter((article) => article.category === entry.id),
      })).filter((group) => group.articles.length > 0),
    [results],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* First, because the commonest thing somebody needs from a help centre on
          their first visit is not an answer to a question — it is the shape of
          the thing they just opened. */}
      <Link
        href="/pengaturan/bantuan/panduan"
        className="bg-card border-border hover:border-primary/40 focus-visible:ring-ring/50 flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors outline-none focus-visible:ring-[3px]"
      >
        <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
          <Compass className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Panduan cepat</p>
          <p className="text-muted-foreground text-sm text-pretty">
            Empat hal yang kamu lakukan di sepuluh menit pertama, berurutan.
          </p>
        </div>
        <ArrowUpRight className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
      </Link>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari jawaban — mis. kode sesi, watermark, kedaluwarsa…"
            aria-label="Cari artikel bantuan"
            className="pl-8"
          />
          {searching && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Bersihkan pencarian"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-1 -translate-y-1/2"
            >
              <X />
            </Button>
          )}
        </div>

        <div
          role="group"
          aria-label="Kategori artikel"
          className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5"
        >
          <Chip
            active={category === null}
            onClick={() => setCategory(null)}
            count={HELP_ARTICLES.length}
          >
            Semua
          </Chip>
          {HELP_CATEGORIES.map((entry) => (
            <Chip
              key={entry.id}
              active={category === entry.id}
              onClick={() =>
                setCategory((current) => (current === entry.id ? null : entry.id))
              }
              count={counts[entry.id]}
            >
              {entry.label}
            </Chip>
          ))}
        </div>
      </div>

      {results.length === 0 ? (
        <div className="bg-card border-border flex flex-col items-center gap-3 rounded-xl border px-6 py-12 text-center">
          <p className="text-sm">Tidak ada artikel yang cocok.</p>
          <p className="text-muted-foreground max-w-sm text-sm text-pretty">
            Coba kata lain, atau balas email tautan masukmu — pertanyaan yang
            belum terjawab di sini justru yang paling ingin kami dengar.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setQuery("");
              setCategory(null);
            }}
          >
            Tampilkan semua artikel
          </Button>
        </div>
      ) : searching ? (
        <section className="bg-card border-border overflow-hidden rounded-xl border">
          <div className="border-border flex items-baseline justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Hasil pencarian</h2>
            <span className="text-muted-foreground text-xs tabular-nums">
              {results.length} artikel
            </span>
          </div>
          <div className="divide-border divide-y">
            {results.map((article) => (
              <Article key={`${query}-${article.slug}`} article={article} open />
            ))}
          </div>
        </section>
      ) : (
        groups.map((group) => (
          <section
            key={group.id}
            className="bg-card border-border overflow-hidden rounded-xl border"
          >
            <div className="border-border flex items-baseline justify-between border-b px-4 py-3">
              <h2 className="text-sm font-semibold">{group.label}</h2>
              <span className="text-muted-foreground text-xs tabular-nums">
                {group.articles.length} artikel
              </span>
            </div>
            <div className="divide-border divide-y">
              {group.articles.map((article) => (
                <Article key={article.slug} article={article} open={false} />
              ))}
            </div>
          </section>
        ))
      )}

      <p className="text-muted-foreground text-xs">
        {results.length} dari {HELP_ARTICLES.length} artikel ditampilkan.
      </p>
    </div>
  );
}

function Chip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "focus-visible:ring-ring/50 shrink-0 rounded-full border px-3 py-1 text-xs whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px]",
        active
          ? "border-primary bg-primary/10 text-primary font-medium"
          : "border-border text-muted-foreground hover:bg-accent",
      )}
    >
      {children}
      <span className="ml-1.5 tabular-nums opacity-70">{count}</span>
    </button>
  );
}
