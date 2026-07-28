"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { MateriItem } from "@/lib/materi/chapters";
import { cn } from "@/lib/utils";

/**
 * A collapsible list of items.
 *
 * Each row is a trigger (the item's label) over a body that expands on click —
 * good for content read on demand, like the JSA columns. Rows open independently,
 * so a reader can compare two at once. The body animates its height open and
 * closed; reduced-motion readers get an instant toggle. Hand-rolled rather than
 * pulled from a Radix accordion — the behaviour needed is just a toggle and the
 * ARIA wiring, keeping the dependency list where it is.
 */
export function MateriAccordion({ items }: { items: MateriItem[] }) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState<string[]>(items[0] ? [items[0].id] : []);

  function toggle(id: string) {
    setOpen((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  return (
    <div className="border-border divide-border overflow-hidden rounded-xl border">
      {items.map((item) => {
        const isOpen = open.includes(item.id);
        const bodyId = `${item.id}-body`;

        return (
          <div key={item.id} className="border-border not-first:border-t">
            <h4>
              <button
                type="button"
                onClick={() => toggle(item.id)}
                aria-expanded={isOpen}
                aria-controls={bodyId}
                className="focus-visible:ring-ring/50 hover:bg-muted/50 flex w-full items-center justify-between gap-3 px-4 py-3 text-left outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-inset"
              >
                <span className="text-sm font-medium text-pretty">
                  {item.label}
                </span>
                <ChevronDown
                  className={cn(
                    "text-muted-foreground size-4 shrink-0 transition-transform duration-200",
                    isOpen && "rotate-180",
                  )}
                />
              </button>
            </h4>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={bodyId}
                  role="region"
                  initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-2 px-4 pt-0 pb-4">
                    {item.detail && (
                      <p className="text-muted-foreground text-sm leading-relaxed text-pretty">
                        {item.detail}
                      </p>
                    )}
                    {item.points && item.points.length > 0 && (
                      <ul className="flex flex-col gap-1.5">
                        {item.points.map((point, index) => (
                          <li
                            key={index}
                            className="text-foreground/90 flex gap-2.5 text-sm leading-relaxed"
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
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
