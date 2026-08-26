"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { useEditorStore } from "@/store/editor-store";

const CLASSES = ["page-enter-next", "page-enter-prev"] as const;

/**
 * Marks a page change on the stage.
 *
 * Switching pages replaces the whole canvas at once — same size, same position,
 * different picture — and without a beat of motion it reads as a glitch rather
 * than a move. The slide carries the direction: the next page comes in from the
 * right, the previous one from the left, matching both the strip's left-to-right
 * order and Alt+←/→.
 *
 * The animation is put on with `classList` instead of a `key`, because re-keying
 * this element would remount the Konva stage: the WebGL-ish canvas would be torn
 * down and rebuilt, the export snapshot would blink out of the registry, and the
 * fit-to-screen measurement would start from zero — a lot of machinery to pay
 * for 200ms of movement.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const activePageId = useEditorStore((state) => state.activePageId);
  const pages = useEditorStore((state) => state.project.pages);

  const ref = useRef<HTMLDivElement>(null);
  const previousIndex = useRef<number | null>(null);

  useEffect(() => {
    const index = pages.findIndex((page) => page.id === activePageId);
    const from = previousIndex.current;
    previousIndex.current = index;

    // Nothing to announce on first paint, and a page that was deleted or added
    // shifts every index after it — only a real move gets the motion.
    if (from === null || from === index || index === -1) return;

    const element = ref.current;
    if (!element) return;

    element.classList.remove(...CLASSES);
    // Reading layout flushes the removal, so the animation restarts even when
    // the direction is the same as last time.
    void element.offsetWidth;
    element.classList.add(index > from ? CLASSES[0] : CLASSES[1]);
  }, [activePageId, pages]);

  return (
    <div ref={ref} className="h-full w-full">
      {children}
    </div>
  );
}
