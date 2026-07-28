"use client";

import { useCallback, useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

import { ChapterArticle } from "@/components/materi/chapter-article";
import { ChapterSidebar } from "@/components/materi/chapter-sidebar";
import {
  MATERI_CHAPTER_IDS,
  MATERI_CHAPTERS,
} from "@/lib/materi/chapters";
import {
  readLastReadChapter,
  writeLastReadChapter,
} from "@/lib/materi/last-read";
import { useMateriProgress } from "@/hooks/use-materi-progress";
import { useScrollSpy } from "@/hooks/use-scroll-spy";

/**
 * The Materi screen: chapter rail beside one continuous, scrollable reader.
 *
 * Every chapter is rendered stacked so the material reads top to bottom. Tapping
 * a chapter — in the sidebar or via a chapter's prev/next — smoothly scrolls it
 * into view, and a scroll-spy keeps the sidebar's active mark in sync with
 * whatever the reader is currently on, from either direction. On a wide screen
 * the rail sticks beside the content; on mobile it stacks above. Content is seed
 * material for now; the backend phase feeds the same chapter shape from the DB.
 */
export function MateriShell() {
  const reduceMotion = useReducedMotion();
  const activeId = useScrollSpy(MATERI_CHAPTER_IDS);
  const { completed, markComplete } = useMateriProgress();

  // Reaching a chapter counts as having worked through it — mark it as the
  // reader scrolls (or jumps) onto it, so the sidebar's progress reflects where
  // they've been.
  useEffect(() => {
    if (activeId) markComplete(activeId);
  }, [activeId, markComplete]);

  const scrollToChapter = useCallback(
    (id: string, behavior: ScrollBehavior = reduceMotion ? "auto" : "smooth") => {
      const element = document.getElementById(id);
      if (!element) return;
      element.scrollIntoView({ behavior, block: "start" });
    },
    [reduceMotion],
  );

  // Drop the reader back where they left off. Runs once on mount: if a later
  // chapter was stored, jump straight to it (no smooth scroll on load). The
  // scroll then drives the scroll-spy, which updates `activeId` and, in turn,
  // the persisted position — so the save effect below skips its first run to
  // avoid clobbering the stored id with the initial top-of-page chapter.
  useEffect(() => {
    const stored = readLastReadChapter();
    if (stored && stored !== MATERI_CHAPTERS[0].id) {
      scrollToChapter(stored, "auto");
    }
    // Restore only on mount; scrollToChapter is stable enough for this intent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isFirstSave = useRef(true);
  useEffect(() => {
    if (isFirstSave.current) {
      isFirstSave.current = false;
      return;
    }
    if (activeId) writeLastReadChapter(activeId);
  }, [activeId]);

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,18rem)_1fr]">
      <div className="lg:sticky lg:top-6">
        <ChapterSidebar
          chapters={MATERI_CHAPTERS}
          activeId={activeId}
          completedIds={completed}
          onSelect={scrollToChapter}
        />
      </div>

      <div className="flex flex-col gap-4">
        {MATERI_CHAPTERS.map((chapter, index) => (
          <ChapterArticle
            key={chapter.id}
            chapter={chapter}
            prevId={MATERI_CHAPTERS[index - 1]?.id}
            nextId={MATERI_CHAPTERS[index + 1]?.id}
            onNavigate={scrollToChapter}
          />
        ))}
      </div>
    </div>
  );
}
