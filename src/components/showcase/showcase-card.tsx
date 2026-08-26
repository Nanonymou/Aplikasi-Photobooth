"use client";

import Link from "next/link";
import { Bookmark, GitBranch, Heart, Images, Wand2 } from "lucide-react";

import { initials } from "@/lib/auth/initials";
import {
  toggleLike,
  toggleSave,
  useLiked,
  useSaved,
} from "@/lib/showcase/reactions";
import {
  formatCount,
  shapeLabel,
  type ShowcaseItem,
} from "@/lib/showcase/feed";
import { cn } from "@/lib/utils";

/**
 * One published design, as a card.
 *
 * The unit the public showcase is built from, and the reason it is its own
 * component rather than markup inside the grid: the same card belongs on a
 * profile, in a "serupa dengan ini" row, and in search results, and three copies
 * of it is how those three places start disagreeing about what a design is.
 *
 * The preview keeps the design's own aspect ratio instead of a fixed crop. The
 * shape is what a visitor is choosing between — a photostrip, a square card and
 * a wide cover are three different things to make — and squeezing them into one
 * box hides the only property somebody browsing templates is shopping for. Until
 * published designs carry a rendered thumbnail, the fill is a tint from the
 * entry, which at least keeps a wall of twelve cards apart at a glance.
 *
 * Exactly one link covers the preview, and the like button sits outside it: a
 * button inside an anchor is invalid, and a card that is one big link with
 * things inside it is a card a keyboard cannot use.
 */
export function ShowcaseCard({ item }: { item: ShowcaseItem }) {
  // The count moves the moment it is pressed rather than after a round trip —
  // which is what a real like does too, it just reconciles afterwards. The
  // stored feed count plus this visitor's own vote is the whole arithmetic.
  const liked = useLiked(item.id);
  const saved = useSaved(item.id);
  const likes = item.likes + (liked ? 1 : 0);

  return (
    <article className="bg-card border-border hover:border-primary/50 mb-3 flex break-inside-avoid flex-col overflow-hidden rounded-xl border transition-colors">
      {/* Straight into the editor, not to a detail page that does not exist yet.
          The id rides along so the new session can credit what it came from —
          a remix without the name of what was remixed is just a copy. */}
      <Link
        href={`/tamu?remix=${item.id}`}
        aria-label={`Remix ${item.title} oleh ${item.author}`}
        className="focus-visible:ring-ring/50 group/preview relative flex items-center justify-center outline-none focus-visible:ring-[3px] focus-visible:ring-inset"
        style={{
          aspectRatio: `${item.width} / ${item.height}`,
          background: `linear-gradient(135deg, hsl(${item.hue} 70% 55% / 0.35), hsl(${(item.hue + 50) % 360} 70% 50% / 0.12))`,
        }}
      >
        <Images className="text-foreground/25 size-8" />

        <span className="bg-background/80 text-muted-foreground absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur">
          {shapeLabel(item)} · {item.width}×{item.height}
        </span>

        {/* Named on focus as well as on hover, so the action is not a secret
            kept from anyone using a keyboard. Scoped to the link rather than the
            card, because it describes what *this* link does — a card-wide
            focus-within would light it up while the like button has focus. */}
        <span className="bg-background/85 text-foreground pointer-events-none absolute inset-x-2 bottom-2 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium opacity-0 backdrop-blur transition-opacity group-hover/preview:opacity-100 group-focus-visible/preview:opacity-100">
          <Wand2 className="size-3.5" />
          Remix desain ini
        </span>
      </Link>

      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-start gap-2">
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-medium"
            style={{
              backgroundColor: `hsl(${item.hue} 60% 50% / 0.18)`,
              color: `hsl(${item.hue} 70% 45%)`,
            }}
          >
            {initials(item.author)}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium">{item.title}</h3>
            <p className="text-muted-foreground truncate text-xs">
              {item.author} · {item.at}
            </p>
            {/* Credit where the design came from, on the card rather than only
                on a detail page: this line is the reason the person underneath
                it was willing to publish at all. */}
            {item.remixOf && (
              <p className="text-muted-foreground/80 mt-0.5 flex items-center gap-1 truncate text-[11px]">
                <GitBranch className="size-3 shrink-0" />
                <span className="truncate">
                  Remix dari {item.remixOf.title} · {item.remixOf.author}
                </span>
              </p>
            )}
          </div>
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

        <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs tabular-nums">
          <div className="flex items-center gap-0.5">
            {/* Two gestures, not one: a like is a signal to whoever made this, a
                save is a note to yourself. A single star would mean both and
                therefore neither. */}
            <button
              type="button"
              onClick={() => toggleLike(item.id)}
              aria-pressed={liked}
              aria-label={liked ? `Batal suka ${item.title}` : `Suka ${item.title}`}
              className={cn(
                "focus-visible:ring-ring/50 -ml-1 flex items-center gap-1 rounded-full px-1.5 py-0.5 outline-none transition-colors focus-visible:ring-2",
                liked ? "text-rose-500" : "hover:bg-muted hover:text-foreground",
              )}
            >
              <Heart className={cn("size-3.5", liked && "fill-current")} />
              {formatCount(likes)}
            </button>

            <button
              type="button"
              onClick={() => toggleSave(item.id)}
              aria-pressed={saved}
              aria-label={
                saved ? `Hapus ${item.title} dari simpanan` : `Simpan ${item.title}`
              }
              className={cn(
                "focus-visible:ring-ring/50 flex items-center rounded-full p-1 outline-none transition-colors focus-visible:ring-2",
                saved ? "text-primary" : "hover:bg-muted hover:text-foreground",
              )}
            >
              <Bookmark className={cn("size-3.5", saved && "fill-current")} />
            </button>
          </div>

          <span className="flex items-center gap-1">
            <GitBranch className="size-3.5" />
            {formatCount(item.remixes)} remix
          </span>
        </div>
      </div>
    </article>
  );
}
