"use client";

import { Bookmark, Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCount, type ShowcaseItem } from "@/lib/showcase/feed";
import {
  toggleLike,
  toggleSave,
  useLiked,
  useSaved,
} from "@/lib/showcase/reactions";
import { cn } from "@/lib/utils";

/**
 * Like and save, at the size a detail page can afford.
 *
 * The same two gestures as the card and the same store behind them — a second
 * copy of "what does saved mean" is how a card and a page start disagreeing
 * about whether something is saved. Only the shape is different: here there is
 * room to say the words.
 */
export function ShowcaseReactions({ item }: { item: ShowcaseItem }) {
  const liked = useLiked(item.id);
  const saved = useSaved(item.id);

  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        variant="outline"
        onClick={() => toggleLike(item.id)}
        aria-pressed={liked}
        className={cn(liked && "border-rose-500/60 text-rose-500")}
      >
        <Heart className={cn(liked && "fill-current")} />
        {formatCount(item.likes + (liked ? 1 : 0))}
      </Button>

      <Button
        variant="outline"
        onClick={() => toggleSave(item.id)}
        aria-pressed={saved}
        className={cn(saved && "border-primary/60 text-primary")}
      >
        <Bookmark className={cn(saved && "fill-current")} />
        {saved ? "Tersimpan" : "Simpan"}
      </Button>
    </div>
  );
}
