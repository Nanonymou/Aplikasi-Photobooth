import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { SectionHeading } from "@/components/settings/section-heading";
import { Button } from "@/components/ui/button";
import {
  articleBySlug,
  articlesIn,
  categoryLabel,
  HELP_ARTICLES,
} from "@/lib/help/articles";

/**
 * Every article, known at build time.
 *
 * The catalogue is a compiled constant, so there is nothing to look up at
 * request time and no reason to render these on demand.
 */
export function generateStaticParams() {
  return HELP_ARTICLES.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const article = articleBySlug((await params).slug);
  if (!article) return { title: "Artikel tidak ditemukan — FrameStudio AI" };

  return {
    title: `${article.title} — Bantuan FrameStudio AI`,
    // The summary is written as the answer in one sentence, which is exactly
    // what a description is for — no second version to keep in step.
    description: article.summary,
  };
}

/**
 * One help article, on its own page.
 *
 * The list next door opens articles where they sit, which is the right way to
 * read one while scanning several. This is the other thing an answer needs: an
 * address. A link somebody can send to the person who asked, that opens on the
 * answer rather than on a list with the answer somewhere inside it.
 *
 * Ends with the rest of its category rather than a generic "back": somebody who
 * read about session codes usually has a second question about session codes.
 */
export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const article = articleBySlug((await params).slug);
  if (!article) notFound();

  const siblings = articlesIn(article.category).filter(
    (entry) => entry.slug !== article.slug,
  );

  return (
    <>
      <div className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
          <Link href="/pengaturan/bantuan">
            <ArrowLeft />
            Bantuan
          </Link>
        </Button>

        <span className="text-primary text-xs font-medium">
          {categoryLabel(article.category)}
        </span>

        <SectionHeading title={article.title} description={article.summary} />
      </div>

      <article className="bg-card border-border text-muted-foreground flex flex-col gap-3 rounded-xl border px-4 py-4 text-sm leading-relaxed">
        {article.body.map((paragraph) => (
          <p key={paragraph} className="text-pretty">
            {paragraph}
          </p>
        ))}
      </article>

      {siblings.length > 0 && (
        <section className="bg-card border-border overflow-hidden rounded-xl border">
          <div className="border-border border-b px-4 py-3">
            <h2 className="text-sm font-semibold">
              Lainnya di {categoryLabel(article.category)}
            </h2>
          </div>

          <div className="divide-border divide-y">
            {siblings.map((entry) => (
              <Link
                key={entry.slug}
                href={`/pengaturan/bantuan/${entry.slug}`}
                className="hover:bg-accent/40 focus-visible:ring-ring/50 block px-4 py-3 outline-none focus-visible:ring-[3px] focus-visible:ring-inset"
              >
                <p className="text-sm font-medium">{entry.title}</p>
                <p className="text-muted-foreground text-sm text-pretty">
                  {entry.summary}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
