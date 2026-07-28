"use client";

import { useMemo, useState } from "react";

import { ChapterSidebar } from "@/components/materi/chapter-sidebar";
import { MateriReader } from "@/components/materi/materi-reader";
import { MATERI_CHAPTERS } from "@/lib/materi/chapters";

/**
 * The Materi screen: chapter rail beside the content area.
 *
 * Owns which chapter is active — the sidebar reports taps, the reader renders the
 * selection, and prev/next step through the ordered list from either side. On a
 * wide screen the two sit side by side; on mobile the rail stacks above the
 * content. Everything runs on the seed material for now; the backend phase will
 * feed the same chapter shape from the database.
 */
export function MateriShell() {
  const [activeId, setActiveId] = useState(MATERI_CHAPTERS[0].id);

  const activeIndex = useMemo(
    () => MATERI_CHAPTERS.findIndex((chapter) => chapter.id === activeId),
    [activeId],
  );

  const chapter = MATERI_CHAPTERS[activeIndex] ?? MATERI_CHAPTERS[0];
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < MATERI_CHAPTERS.length - 1;

  function goTo(index: number) {
    const next = MATERI_CHAPTERS[index];
    if (next) setActiveId(next.id);
  }

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,18rem)_1fr]">
      <div className="lg:sticky lg:top-6">
        <ChapterSidebar
          chapters={MATERI_CHAPTERS}
          activeId={activeId}
          onSelect={setActiveId}
        />
      </div>

      <MateriReader
        chapter={chapter}
        hasPrev={hasPrev}
        hasNext={hasNext}
        onPrev={() => goTo(activeIndex - 1)}
        onNext={() => goTo(activeIndex + 1)}
      />
    </div>
  );
}
