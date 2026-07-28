"use client";

import { Check } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "motion/react";

import type { MateriItem } from "@/lib/materi/chapters";
import { cn } from "@/lib/utils";

/** Container staggers its cards in as the grid scrolls into view. */
const CONTAINER: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const CARD: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } },
};

/**
 * A responsive grid of content cards.
 *
 * Two shapes feed it: `items` (a title, an optional line, and example points)
 * render as detail cards; a plain `bullets` list renders as compact check cards —
 * good for objectives and checklists. Cards stagger in on scroll, so a long list
 * arrives as a sequence rather than a wall.
 */
export function MateriCards({
  items,
  bullets,
}: {
  items?: MateriItem[];
  bullets?: string[];
}) {
  const reduceMotion = useReducedMotion();

  const container = reduceMotion ? undefined : CONTAINER;
  const card = reduceMotion ? undefined : CARD;
  const motionProps = reduceMotion
    ? {}
    : {
        variants: container,
        initial: "hidden" as const,
        whileInView: "show" as const,
        viewport: { once: true, margin: "-60px" },
      };

  if (items && items.length > 0) {
    return (
      <motion.div
        {...motionProps}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        {items.map((item) => (
          <motion.div
            key={item.id}
            variants={card}
            className="bg-background border-border hover:border-primary/40 flex flex-col gap-2 rounded-xl border p-4 transition-colors"
          >
            <p className="text-sm font-semibold tracking-tight">{item.label}</p>
            {item.detail && (
              <p className="text-muted-foreground text-sm leading-relaxed text-pretty">
                {item.detail}
              </p>
            )}
            {item.points && item.points.length > 0 && (
              <ul className="mt-1 flex flex-col gap-1.5">
                {item.points.map((point, index) => (
                  <li
                    key={index}
                    className="text-foreground/90 flex gap-2 text-sm leading-relaxed"
                  >
                    <span
                      aria-hidden
                      className="bg-primary/60 mt-2 size-1.5 shrink-0 rounded-full"
                    />
                    <span className="text-pretty">{point}</span>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        ))}
      </motion.div>
    );
  }

  return (
    <motion.ul
      {...motionProps}
      className={cn("grid grid-cols-1 gap-2.5 sm:grid-cols-2")}
    >
      {(bullets ?? []).map((bullet, index) => (
        <motion.li
          key={index}
          variants={card}
          className="bg-background border-border hover:border-primary/40 flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors"
        >
          <span className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-lg">
            <Check className="size-4" />
          </span>
          <span className="text-sm font-medium text-pretty">{bullet}</span>
        </motion.li>
      ))}
    </motion.ul>
  );
}
