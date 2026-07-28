"use client";

import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { Button } from "@/components/ui/button";
import type { MateriChapter } from "@/lib/materi/chapters";

/**
 * One chapter in the continuous Materi reader.
 *
 * Each chapter is an anchor (`id`) the sidebar and scroll-spy target, so the
 * article sits in a scrollable column with its siblings rather than swapping in
 * and out. `scroll-mt` keeps its heading clear of the top edge after a
 * scroll-to. A one-shot fade as it enters the viewport gives the light motion the
 * brief asks for without re-animating on every scroll. The footer walks to the
 * neighbouring chapter through the same scroll-to the sidebar uses.
 */
export function ChapterArticle({
  chapter,
  prevId,
  nextId,
  onNavigate,
}: {
  chapter: MateriChapter;
  prevId?: string;
  nextId?: string;
  onNavigate: (id: string) => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      id={chapter.id}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="bg-card border-border flex scroll-mt-6 flex-col rounded-xl border"
    >
      <header className="border-border border-b px-5 py-4 sm:px-6">
        <p className="text-primary text-xs font-semibold tracking-wide uppercase">
          Bab {chapter.order}
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-balance sm:text-2xl">
          {chapter.title}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm text-pretty">
          {chapter.summary}
        </p>
        <p className="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
          <Clock className="size-3.5" />± {chapter.minutes} menit baca
        </p>
      </header>

      <div className="flex flex-col gap-8 px-5 py-6 sm:px-6">
        {chapter.sections.map((section) => (
          <section key={section.id} className="flex flex-col gap-3">
            <h3 className="text-base font-semibold tracking-tight">
              {section.heading}
            </h3>

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
      </div>

      <footer className="border-border flex items-center justify-between gap-3 border-t px-5 py-4 sm:px-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => prevId && onNavigate(prevId)}
          disabled={!prevId}
        >
          <ArrowLeft />
          Sebelumnya
        </Button>
        <Button
          size="sm"
          onClick={() => nextId && onNavigate(nextId)}
          disabled={!nextId}
        >
          Selanjutnya
          <ArrowRight />
        </Button>
      </footer>
    </motion.article>
  );
}
