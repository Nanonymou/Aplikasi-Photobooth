"use client";

import { demoShotSource } from "@/lib/camera/demo-shots";
import { useActivePage, useEditorStore } from "@/store/editor-store";
import type { PhotoSlotObject } from "@/types/editor";

/**
 * The "look" of a page — its photo filters and its visual effects — as one piece
 * of state.
 *
 * Filters live on each photo and effects live on the page, but they are chosen
 * together and share one rule about *what is being styled*: a selection if there
 * is one, otherwise the whole page, because a photostrip is normally meant to
 * match. That rule belongs in one place — a second surface that gets it slightly
 * different is how two panels start disagreeing about what "apply" means.
 */

export interface LooksState {
  /** Slots the filter will be written to. Empty when the page has no photos. */
  targets: PhotoSlotObject[];
  /** True when the aim came from a selection rather than the whole page. */
  fromSelection: boolean;
  /** A real photo to preview swatches on; a sample only if the page has none. */
  previewSrc: string;
  /** The filter currently on the targeted photos. */
  filterId: string;
  /** Effects currently on the page. */
  effectIds: string[];
  /** Writes the filter to every targeted photo, as one undo step. */
  applyFilter: (filterId: string) => void;
  /** Turns one effect on or off for the page. */
  toggleEffect: (effectId: string) => void;
  /** Strips filters and effects from the page. */
  clear: () => void;
  /** True when anything is styled — lets a reset control disable itself. */
  hasLooks: boolean;
}

export function useLooks(): LooksState {
  const page = useActivePage();
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const setSlotFilter = useEditorStore((state) => state.setSlotFilter);
  const togglePageEffect = useEditorStore((state) => state.togglePageEffect);
  const clearLooks = useEditorStore((state) => state.clearLooks);

  const filled = page.objects.filter(
    (object): object is PhotoSlotObject =>
      object.kind === "slot" && object.photo !== null,
  );
  const selected = filled.filter((slot) => selectedIds.includes(slot.id));
  const targets = selected.length > 0 ? selected : filled;

  const effectIds = page.effects ?? [];
  const filterId = targets[0]?.photo?.filter ?? "none";

  return {
    targets,
    fromSelection: selected.length > 0,
    previewSrc: targets[0]?.photo?.src ?? demoShotSource(0),
    filterId,
    effectIds,
    applyFilter: (id) => {
      if (targets.length === 0) return;
      setSlotFilter(
        targets.map((slot) => slot.id),
        id,
      );
    },
    toggleEffect: togglePageEffect,
    clear: clearLooks,
    hasLooks:
      effectIds.length > 0 ||
      filled.some((slot) => (slot.photo?.filter ?? "none") !== "none"),
  };
}
