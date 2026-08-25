import { ChevronDown } from "lucide-react";

import {
  articlesIn,
  HELP_ARTICLES,
  HELP_CATEGORIES,
  type HelpArticle,
} from "@/lib/help/articles";

function Article({ article }: { article: HelpArticle }) {
  return (
    // `details` rather than a hook: opening one short answer is exactly what the
    // element does, it works before any JavaScript arrives, and the keyboard and
    // screen-reader behaviour come for free.
    <details className="group">
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
 * The help centre's articles, grouped by what somebody is trying to do.
 *
 * Grouped rather than listed flat because the grouping is how people arrive:
 * "something about sharing" is a better first cut than scanning eight titles,
 * and eight is already enough that scanning costs something.
 *
 * Each article opens where it sits. A short answer that needs a page of its own
 * is a page somebody has to come back from — and coming back to a list you had
 * scrolled halfway down is the part nobody gets right.
 */
export function HelpArticles() {
  return (
    <div className="flex flex-col gap-4">
      {HELP_CATEGORIES.map((category) => {
        const articles = articlesIn(category.id);
        if (articles.length === 0) return null;

        return (
          <section
            key={category.id}
            className="bg-card border-border overflow-hidden rounded-xl border"
          >
            <div className="border-border flex items-baseline justify-between border-b px-4 py-3">
              <h2 className="text-sm font-semibold">{category.label}</h2>
              <span className="text-muted-foreground text-xs tabular-nums">
                {articles.length} artikel
              </span>
            </div>

            <div className="divide-border divide-y">
              {articles.map((article) => (
                <Article key={article.slug} article={article} />
              ))}
            </div>
          </section>
        );
      })}

      <p className="text-muted-foreground text-xs">
        {HELP_ARTICLES.length} artikel. Belum ketemu jawabannya? Balas email
        tautan masukmu — pesannya sampai ke kami.
      </p>
    </div>
  );
}
