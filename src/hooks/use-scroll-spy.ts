"use client";

import { useEffect, useState } from "react";

/**
 * Scroll-spy over a fixed, ordered list of element ids.
 *
 * Reports which section the reader is currently looking at so a nav can highlight
 * it as they scroll. An IntersectionObserver watches each element through a band
 * biased toward the top of the viewport; among the elements crossing that band,
 * the one earliest in `ids` wins, which keeps the active mark from flickering
 * between neighbours. The last known id is held when nothing is in the band (e.g.
 * mid-scroll between two tall sections), so the highlight never blanks out.
 *
 * `ids` must be a stable reference (module constant or memoised) — a fresh array
 * each render would tear down and rebuild the observer on every render.
 */
export function useScrollSpy(ids: string[]): string {
  const [activeId, setActiveId] = useState(ids[0] ?? "");

  useEffect(() => {
    if (ids.length === 0) return;

    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }

        const firstVisible = ids.find((id) => visible.has(id));
        if (firstVisible) setActiveId(firstVisible);
      },
      // A band across the upper-middle of the viewport: a section counts as
      // "current" once its top scrolls past the header and before it leaves the
      // upper third.
      { rootMargin: "-15% 0px -55% 0px", threshold: 0 },
    );

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [ids]);

  return activeId;
}
