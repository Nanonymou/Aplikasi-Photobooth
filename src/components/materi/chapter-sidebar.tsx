"use client";

import { BookOpen, Clock } from "lucide-react";

import { MATERI_TOTAL_MINUTES, type MateriChapter } from "@/lib/materi/chapters";
import { cn } from "@/lib/utils";

/**
 * The chapter rail for the Materi screen.
 *
 * Walks the material in order so a peserta always knows where they are and what's
 * next. Each row is the chapter's number, title, and gist; the active one is
 * highlighted. Selection is lifted to the shell — this only reports which chapter
 * was tapped, so the same list drives the content area beside it.
 */
export function ChapterSidebar({
  chapters,
  activeId,
  onSelect,
}: {
  chapters: MateriChapter[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav
      aria-label="Daftar bab materi"
      className="bg-card border-border flex flex-col rounded-xl border"
    >
      <div className="border-border flex items-center gap-2.5 border-b px-4 py-3">
        <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
          <BookOpen className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight">Daftar Bab</p>
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            <Clock className="size-3" />
            {chapters.length} bab · ± {MATERI_TOTAL_MINUTES} menit
          </p>
        </div>
      </div>

      <ol className="flex flex-col gap-1 p-2">
        {chapters.map((chapter) => {
          const active = chapter.id === activeId;
          return (
            <li key={chapter.id}>
              <button
                type="button"
                onClick={() => onSelect(chapter.id)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "focus-visible:ring-ring/50 flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left outline-none transition-colors focus-visible:ring-[3px]",
                  active
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold tabular-nums",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {chapter.order}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {chapter.title}
                  </span>
                  <span className="text-muted-foreground mt-0.5 block text-xs leading-snug text-pretty">
                    {chapter.summary}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
