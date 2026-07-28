"use client";

import { BookOpen, Check } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { type MateriChapter } from "@/lib/materi/chapters";
import { cn } from "@/lib/utils";

/**
 * The chapter rail for the Materi screen.
 *
 * Walks the material in order so a peserta always knows where they are, what's
 * next, and how far they've come. A progress bar at the top sums the chapters
 * they've reached; each row then shows its own state — a check once worked
 * through, a filled marker for the one in view, a plain number for what's ahead.
 * Selection is lifted to the shell, so the same list drives the content beside it.
 */
export function ChapterSidebar({
  chapters,
  activeId,
  completedIds,
  onSelect,
}: {
  chapters: MateriChapter[];
  activeId: string;
  completedIds: string[];
  onSelect: (id: string) => void;
}) {
  const completedCount = chapters.filter((chapter) =>
    completedIds.includes(chapter.id),
  ).length;
  const ratio = chapters.length === 0 ? 0 : completedCount / chapters.length;
  const percent = Math.round(ratio * 100);

  return (
    <nav
      aria-label="Daftar bab materi"
      className="bg-card border-border flex flex-col rounded-xl border"
    >
      <div className="border-border flex flex-col gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
            <BookOpen className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight">Daftar Bab</p>
            <p className="text-muted-foreground text-xs">
              {completedCount} dari {chapters.length} bab · {percent}% selesai
            </p>
          </div>
        </div>
        <Progress
          value={ratio}
          aria-label={`Progres belajar ${percent} persen`}
        />
      </div>

      <ol className="flex flex-col gap-1 p-2">
        {chapters.map((chapter) => {
          const active = chapter.id === activeId;
          const done = completedIds.includes(chapter.id);

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
                      : done
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {done && !active ? (
                    <Check className="size-3.5" />
                  ) : (
                    chapter.order
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {chapter.title}
                  </span>
                  <span className="text-muted-foreground mt-0.5 hidden text-xs leading-snug text-pretty lg:block">
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
