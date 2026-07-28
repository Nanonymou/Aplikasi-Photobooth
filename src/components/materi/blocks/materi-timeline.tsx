"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";

import type { MateriItem } from "@/lib/materi/chapters";

const CONTAINER: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const STEP: Variants = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

/**
 * A vertical, numbered timeline of ordered steps.
 *
 * For content that is inherently sequential — the HIRADC stages, the six filling
 * steps — where order carries meaning. A connecting rail threads the numbered
 * markers; each step slides in as the list scrolls into view, so the sequence
 * reveals in order rather than all at once.
 */
export function MateriTimeline({ items }: { items: MateriItem[] }) {
  const reduceMotion = useReducedMotion();
  const motionProps = reduceMotion
    ? {}
    : {
        variants: CONTAINER,
        initial: "hidden" as const,
        whileInView: "show" as const,
        viewport: { once: true, margin: "-60px" },
      };

  return (
    <motion.ol {...motionProps} className="flex flex-col">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <motion.li
            key={item.id}
            variants={reduceMotion ? undefined : STEP}
            className="flex gap-4"
          >
            <div className="flex flex-col items-center">
              <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums">
                {index + 1}
              </span>
              {!isLast && <span className="bg-border w-px flex-1" />}
            </div>

            <div className={isLast ? "pb-0" : "pb-6"}>
              <p className="text-sm font-semibold tracking-tight">
                {item.label}
              </p>
              {item.detail && (
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed text-pretty">
                  {item.detail}
                </p>
              )}
              {item.points && item.points.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {item.points.map((point, pointIndex) => (
                    <li
                      key={pointIndex}
                      className="bg-muted text-foreground/80 rounded-md px-2 py-1 text-xs"
                    >
                      {point}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.li>
        );
      })}
    </motion.ol>
  );
}
