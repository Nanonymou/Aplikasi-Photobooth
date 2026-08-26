"use client";

import { ShowcaseGrid } from "@/components/showcase/showcase-grid";
import { useSavedIds } from "@/lib/showcase/reactions";
import type { ShowcaseItem } from "@/lib/showcase/feed";

/**
 * The wall, plus the one narrowing the server cannot do.
 *
 * Category and ordering are decided on the server from the URL, because they are
 * the same for everybody. What this visitor has saved is not: it lives in their
 * browser, so the "tersimpan" view is applied here, after hydration. Which also
 * means the count belongs here — a heading that said "12 karya" over a list of
 * three saved ones would be counting the wrong list.
 */
export function ShowcaseResults({
  items,
  savedOnly,
  category,
}: {
  items: ShowcaseItem[];
  savedOnly: boolean;
  category: string | null;
}) {
  const saved = useSavedIds();
  const shown = savedOnly ? items.filter((item) => saved.has(item.id)) : items;

  return (
    <>
      <p className="text-muted-foreground text-xs tabular-nums" aria-live="polite">
        {shown.length} karya
      </p>

      <ShowcaseGrid
        items={shown}
        empty={
          savedOnly && category
            ? "Belum ada simpanan di kategori ini."
            : savedOnly
              ? "Belum ada yang kamu simpan. Ketuk ikon penanda di kartu untuk menyimpannya."
              : category
                ? "Belum ada karya di kategori ini. Coba kategori lain."
                : undefined
        }
      />
    </>
  );
}
