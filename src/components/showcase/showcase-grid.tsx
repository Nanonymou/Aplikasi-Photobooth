import Link from "next/link";
import { Heart, Images, Sparkles } from "lucide-react";

import {
  formatCount,
  shapeLabel,
  type ShowcaseItem,
} from "@/lib/showcase/feed";

/**
 * A design's card in the public showcase.
 *
 * The preview keeps the design's own aspect ratio rather than a fixed crop: the
 * shape is what a visitor is choosing between, and a strip squeezed into the
 * same box as a square card stops being a strip. Until published designs render
 * a real thumbnail this is a tint derived from the entry, which at least makes
 * a wall of twelve cards distinguishable at a glance.
 */
function ShowcaseCard({ item }: { item: ShowcaseItem }) {
  return (
    <article className="bg-card border-border group mb-3 flex break-inside-avoid flex-col overflow-hidden rounded-xl border">
      {/* Straight into the editor, not to a detail page that does not exist yet:
          a wall of cards that go nowhere is a worse first impression than one
          that goes somewhere useful, and "start from this" is the only thing a
          signed-out visitor can actually do with a template. */}
      <Link
        href="/tamu"
        aria-label={`Buat desain dari ${item.title} oleh ${item.author}`}
        className="focus-visible:ring-ring/50 relative flex items-center justify-center outline-none focus-visible:ring-[3px] focus-visible:ring-inset"
        style={{
          aspectRatio: `${item.width} / ${item.height}`,
          background: `linear-gradient(135deg, hsl(${item.hue} 70% 55% / 0.35), hsl(${(item.hue + 50) % 360} 70% 50% / 0.12))`,
        }}
      >
        <Images className="text-foreground/25 size-8" />
        <span className="bg-background/80 text-muted-foreground absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur">
          {shapeLabel(item)} · {item.width}×{item.height}
        </span>
      </Link>

      <div className="flex flex-col gap-2 p-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium">{item.title}</h3>
          <p className="text-muted-foreground truncate text-xs">
            {item.author} · {item.at}
          </p>
        </div>

        <div className="flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px]"
            >
              #{tag}
            </span>
          ))}
        </div>

        <div className="text-muted-foreground flex items-center gap-3 text-xs tabular-nums">
          <span className="flex items-center gap-1">
            <Heart className="size-3.5" />
            {formatCount(item.likes)}
          </span>
          <span className="flex items-center gap-1">
            <Sparkles className="size-3.5" />
            {formatCount(item.uses)} dipakai
          </span>
        </div>
      </div>
    </article>
  );
}

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
