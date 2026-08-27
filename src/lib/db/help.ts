import "server-only";

import { query } from "@/lib/db/client";

/**
 * The help centre, read from the table it now lives in (migration 0030).
 *
 * Only published rows ever leave this module. A draft is an answer somebody is
 * still writing, and the difference between "not finished" and "not found" is
 * not one a reader should have to work out.
 */

export interface HelpCategory {
  slug: string;
  label: string;
  /** Published articles in this category, for the chip's count. */
  count: number;
}

export interface HelpArticle {
  slug: string;
  title: string;
  summary: string;
  body: string[];
  category: string;
  categoryLabel: string;
  updatedAt: string;
}

interface ArticleRow {
  slug: string;
  title: string;
  summary: string;
  body: string[];
  category_slug: string;
  category_label: string;
  updated_at: Date;
}

function toArticle(row: ArticleRow): HelpArticle {
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    body: row.body,
    category: row.category_slug,
    categoryLabel: row.category_label,
    updatedAt: row.updated_at.toISOString(),
  };
}

/**
 * Every category, with how many published answers it holds.
 *
 * A left join, so a category an admin has created but not yet filled still
 * appears — with a zero beside it, which is the honest thing to show somebody
 * curating the help centre and harmless to a reader.
 */
export async function listHelpCategories(): Promise<HelpCategory[]> {
  const rows = await query<{ slug: string; label: string; count: string }>(
    `select c.slug, c.label, count(a.id) as count
       from help_categories c
       left join help_articles a
         on a.category_id = c.id and a.published_at is not null
      group by c.id
      order by c.position, c.label`,
  );

  return rows.map((row) => ({
    slug: row.slug,
    label: row.label,
    count: Number(row.count),
  }));
}

export interface HelpQuery {
  /** Free text; blank matches everything. */
  query?: string;
  /** A category slug, or undefined for all of them. */
  category?: string;
}

/**
 * Articles matching a filter.
 *
 * Two ways to match, because two different searches arrive here. Every word of
 * the query appearing somewhere in the article — in any order — is the one that
 * finds "tautan kedaluwarsa" in an article that says "tautan" in one sentence
 * and "kedaluwarsa" in the next; matching the phrase as typed would find
 * nothing, because nobody types sentences the way documents are written. And
 * trigram similarity is the one that survives a typo, which is most of what a
 * help search actually receives.
 *
 * The title is compared on its own as well as with the summary appended, and
 * the better of the two decides. Similarity is a ratio over the whole string, so
 * appending a sentence to a matching title drags the score under the threshold —
 * a query that matches the title exactly would be missed by a comparison that
 * only ever looked at both together.
 *
 * An article whose title or summary carries the words comes before one where
 * only the body does. Substring matching is generous in Indonesian — searching
 * "PIN" also finds every article that says "berpindah" — and what separates the
 * article that is *about* something from one that mentions it in passing is
 * whether the word made it into the part somebody wrote as a summary.
 *
 * Then by similarity so a near-exact title wins, then by category and
 * the curated position within it — which is the whole order when the query is
 * blank. Grouping by category there rather than relying on the order articles
 * happen to be written in means the unfiltered list still reads as a contents
 * page, however the catalogue is edited.
 */
export async function searchHelpArticles(
  filter: HelpQuery = {},
): Promise<HelpArticle[]> {
  const text = (filter.query ?? "").trim();
  const words = text.split(/\s+/).filter(Boolean).map((word) => `%${word}%`);

  const rows = await query<ArticleRow>(
    `select a.slug, a.title, a.summary, a.body, a.updated_at,
            c.slug as category_slug, c.label as category_label
       from help_articles a
       join help_categories c on c.id = a.category_id
      where a.published_at is not null
        and ($1::text is null or c.slug = $1)
        and (
          cardinality($2::text[]) = 0
          or a.title || ' ' || a.summary || ' ' || array_to_string(a.body, ' ')
               ilike all ($2::text[])
          or a.title % $3
          or (a.title || ' ' || a.summary) % $3
        )
      order by (a.title || ' ' || a.summary) ilike all ($2::text[]) desc,
               greatest(
                 similarity(a.title, $3),
                 similarity(a.title || ' ' || a.summary, $3)
               ) desc,
               c.position,
               a.position,
               a.title`,
    [filter.category ?? null, words, text],
  );

  return rows.map(toArticle);
}

/** One published article, or null. Drafts are `null` here, not a 500. */
export async function helpArticleBySlug(
  slug: string,
): Promise<HelpArticle | null> {
  const rows = await query<ArticleRow>(
    `select a.slug, a.title, a.summary, a.body, a.updated_at,
            c.slug as category_slug, c.label as category_label
       from help_articles a
       join help_categories c on c.id = a.category_id
      where a.slug = $1 and a.published_at is not null`,
    [slug],
  );

  return rows[0] ? toArticle(rows[0]) : null;
}
