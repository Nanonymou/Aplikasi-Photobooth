"use client";

import { Info, Lightbulb, TriangleAlert, type LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import type { CalloutTone } from "@/lib/materi/chapters";
import { cn } from "@/lib/utils";

/** Icon + tint per tone, so a callout reads by kind at a glance. */
const TONE: Record<CalloutTone, { icon: LucideIcon; box: string; badge: string }> =
  {
    info: {
      icon: Info,
      box: "border-sky-500/25 bg-sky-500/5",
      badge: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    },
    tip: {
      icon: Lightbulb,
      box: "border-emerald-500/25 bg-emerald-500/5",
      badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    },
    warning: {
      icon: TriangleAlert,
      box: "border-amber-500/30 bg-amber-500/5",
      badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    },
  };

/**
 * A tinted callout box — the "ilustrasi" treatment for framing text.
 *
 * Lifts a definition, an intro, or a warning out of the running prose with an
 * icon and a colour that signals its kind. It fades up once as it scrolls into
 * view; reduced-motion readers get it in place.
 */
export function Callout({
  tone,
  paragraphs,
}: {
  tone: CalloutTone;
  paragraphs: string[];
}) {
  const reduceMotion = useReducedMotion();
  const { icon: Icon, box, badge } = TONE[tone];

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn("flex gap-3 rounded-xl border p-4", box)}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          badge,
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="flex min-w-0 flex-col gap-2">
        {paragraphs.map((paragraph, index) => (
          <p
            key={index}
            className="text-foreground/90 text-sm leading-relaxed text-pretty"
          >
            {paragraph}
          </p>
        ))}
      </div>
    </motion.div>
  );
}
