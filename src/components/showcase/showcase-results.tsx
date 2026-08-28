import { ShowcaseGrid } from "@/components/showcase/showcase-grid";
import type { ShowcaseItem } from "@/lib/showcase/feed";

/**
 * The wall, and the count over it.
 *
 * Everything that narrows this list — category, ordering, and the saved shelf —
 * is decided on the server, because only the server can see past the page it
 * returned. Filtering here as well was how the "tersimpan" view came to show
 * whatever subset of one page happened to be saved, and the count over it was
 * counting that subset rather than the shelf.
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
  return (
    <>
      <p className="text-muted-foreground text-xs tabular-nums" aria-live="polite">
        {items.length} karya
      </p>

      <ShowcaseGrid
        items={items}
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
