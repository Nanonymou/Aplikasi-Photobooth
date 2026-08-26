import { ShowcaseCard } from "@/components/showcase/showcase-card";
import type { ShowcaseItem } from "@/lib/showcase/feed";

/**
 * The showcase wall.
 *
 * CSS columns rather than a grid of equal cells, because the cards are
 * deliberately different heights — that is the whole point of keeping each
 * design's ratio — and a row-based grid would leave a ragged band of empty space
 * under every short card. Columns pack them, and reflow by themselves at every
 * width without a measuring pass or a layout library.
 *
 * Reading order goes down each column rather than across, which is what a
 * browse-until-something-catches-your-eye wall wants; it is not a ranking, and
 * nothing here depends on which card comes "after" which.
 */
export function ShowcaseGrid({ items }: { items: ShowcaseItem[] }) {
  if (items.length === 0) {
    return (
      <div className="border-border text-muted-foreground rounded-xl border border-dashed px-4 py-16 text-center text-sm">
        Belum ada karya yang dipublikasikan. Jadilah yang pertama.
      </div>
    );
  }

  return (
    <div className="columns-2 gap-3 md:columns-3 lg:columns-4">
      {items.map((item) => (
        <ShowcaseCard key={item.id} item={item} />
      ))}
    </div>
  );
}
