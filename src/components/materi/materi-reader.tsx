"use client";

import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { Button } from "@/components/ui/button";
import type { MateriChapter } from "@/lib/materi/chapters";

/**
 * The content area for the active chapter.
 *
 * Renders one chapter at a time — a header with its number, title, and pacing,
 * then each section's heading, lead paragraphs, and bullets. A light fade on
 * chapter change keeps the switch from feeling like a page reload. Prev/next
 * buttons walk the same ordered list the sidebar shows. The presentation here is
 * deliberately plain; the richer card / accordion / timeline treatment lands in a
 * later task, but this already reads the real material shape.
 */
export function MateriReader({
  chapter,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: {
  chapter: MateriChapter;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <article className="bg-card border-border flex min-w-0 flex-col rounded-xl border">
      <header className="border-border border-b px-5 py-4 sm:px-6">
        <p className="text-primary text-xs font-semibold tracking-wide uppercase">
          Bab {chapter.order}
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-balance sm:text-2xl">
          {chapter.title}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm text-pretty">
          {chapter.summary}
        </p>
        <p className="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
          <Clock className="size-3.5" />± {chapter.minutes} menit baca
        </p>
      </header>

      <motion.div
        key={chapter.id}
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex flex-col gap-8 px-5 py-6 sm:px-6"
      >
        {chapter.sections.map((section) => (
          <section key={section.id} className="flex flex-col gap-3">
            <h2 className="text-base font-semibold tracking-tight">
              {section.heading}
            </h2>

            {section.paragraphs?.map((paragraph, index) => (
              <p
                key={index}
                className="text-muted-foreground text-sm leading-relaxed text-pretty"
              >
                {paragraph}
              </p>
            ))}

            {section.bullets && section.bullets.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {section.bullets.map((bullet, index) => (
                  <li
                    key={index}
                    className="text-foreground/90 flex gap-2.5 text-sm leading-relaxed"
                  >
                    <span
                      aria-hidden
                      className="bg-primary/60 mt-2 size-1.5 shrink-0 rounded-full"
                    />
                    <span className="text-pretty">{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </motion.div>

      <footer className="border-border flex items-center justify-between gap-3 border-t px-5 py-4 sm:px-6">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={!hasPrev}
        >
          <ArrowLeft />
          Sebelumnya
        </Button>
        <Button size="sm" onClick={onNext} disabled={!hasNext}>
          Selanjutnya
          <ArrowRight />
        </Button>
      </footer>
    </article>
  );
}
