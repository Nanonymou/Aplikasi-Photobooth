"use client";

import { useEffect, useRef } from "react";

import { useEditorStore } from "@/store/editor-store";
import { pageOrientation } from "@/types/editor";
import { cn } from "@/lib/utils";

/**
 * The project's pages, as a row under the stage.
 *
 * A photostrip project is rarely one page — a strip, the card that goes with it,
 * a cover — and until now the only sign that more than one existed was a
 * counter in the status bar. This is where they become reachable: one chip per
 * page, the current one marked, in project order.
 *
 * Horizontal and under the canvas rather than a sidebar, because pages are
 * sequential and read left to right, and because the editor's sides are already
 * spoken for by the tool rail and the inspector. It scrolls rather than wraps:
 * a strip that grows a second row moves the canvas every time somebody adds a
 * page.
 *
 * Each chip says the page's shape as well as its name. Two pages called
 * "Halaman 2" and "Halaman 3" are impossible to tell apart in a list; a tall one
 * and a wide one are not.
 */
export function PageStrip() {
  const pages = useEditorStore((state) => state.project.pages);
  const activePageId = useEditorStore((state) => state.activePageId);
  const setActivePage = useEditorStore((state) => state.setActivePage);

  const activeRef = useRef<HTMLButtonElement>(null);

  // Pages can also change from the keyboard and from the canvas, so the strip
  // follows the selection rather than assuming a click put it there.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activePageId]);

  return (
    <div
      role="tablist"
      aria-label="Halaman"
      aria-orientation="horizontal"
      className="bg-editor-chrome border-editor-border flex shrink-0 items-center gap-1.5 overflow-x-auto border-t px-3 py-2"
    >
      {pages.map((page, index) => {
        const active = page.id === activePageId;
        const landscape = pageOrientation(page) === "landscape";

        return (
          <button
            key={page.id}
            ref={active ? activeRef : undefined}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setActivePage(page.id)}
            className={cn(
              "focus-visible:ring-ring/50 flex shrink-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors outline-none focus-visible:ring-[3px]",
              active
                ? "border-primary bg-primary/10"
                : "border-editor-border hover:bg-accent",
            )}
          >
            {/* Stands in for the thumbnail a later task draws here — but already
                the right shape, so the row's rhythm does not change when the
                real preview arrives. */}
            <span
              aria-hidden="true"
              className={cn(
                "border-editor-border shrink-0 rounded-sm border",
                active ? "bg-primary/20" : "bg-editor-stage",
                landscape ? "h-5 w-7" : "h-7 w-5",
              )}
            />

            <span className="flex flex-col">
              <span
                className={cn(
                  "text-xs leading-tight",
                  active ? "text-foreground font-medium" : "text-muted-foreground",
                )}
              >
                {page.name}
              </span>
              <span className="text-muted-foreground text-[10px] leading-tight tabular-nums">
                {index + 1} · {page.width}×{page.height}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
