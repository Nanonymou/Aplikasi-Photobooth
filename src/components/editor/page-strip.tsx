"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Copy, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PageThumbnail } from "@/components/editor/page-thumbnail";
import { useEditorStore } from "@/store/editor-store";
import { toast } from "@/store/toast-store";
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
 *
 * Adding, duplicating, and deleting all act on the page that is open, so there
 * is never a question of which one a button meant. None of them asks for
 * confirmation — the editor deletes objects the same way, and undo is one
 * keystroke — but deleting says so, because a whole page leaving the screen is
 * worth a sentence.
 */
export function PageStrip() {
  const pages = useEditorStore((state) => state.project.pages);
  const activePageId = useEditorStore((state) => state.activePageId);
  const setActivePage = useEditorStore((state) => state.setActivePage);
  const addPage = useEditorStore((state) => state.addPage);
  const duplicatePage = useEditorStore((state) => state.duplicatePage);
  const removePage = useEditorStore((state) => state.removePage);

  const activeRef = useRef<HTMLButtonElement>(null);

  // The last page has no delete button rather than a disabled one: a control
  // that is never usable in a one-page project is a control that only ever
  // teaches people it does nothing.
  const canRemove = pages.length > 1;

  const index = pages.findIndex((page) => page.id === activePageId);

  function step(delta: number) {
    const next = pages[index + delta];
    if (next) setActivePage(next.id);
  }

  function remove() {
    const page = pages.find((candidate) => candidate.id === activePageId);
    if (!page || !canRemove) return;

    removePage(page.id);
    toast({
      variant: "info",
      title: `"${page.name}" dihapus`,
      description: "Ctrl+Z mengembalikannya.",
    });
  }

  // Pages can also change from the keyboard and from the canvas, so the strip
  // follows the selection rather than assuming a click put it there. It glides
  // so the row reads as having moved along rather than having been re-drawn —
  // which matters most when Alt+→ is walking a long strip and the chips would
  // otherwise teleport.
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [activePageId]);

  return (
    <div
      role="tablist"
      aria-label="Halaman"
      aria-orientation="horizontal"
      className="bg-editor-chrome border-editor-border flex shrink-0 items-center gap-1.5 overflow-x-auto border-t py-2 pr-3 pl-2"
    >
      {/* Actions first, pinned left, so they stay put as the strip grows and
          scrolls — a button that walks away is a button people stop reaching
          for. Opaque, because a pinned group with a see-through background has
          the scrolled chips sliding visibly behind the buttons. */}
      <div className="bg-editor-chrome sticky left-0 z-10 flex shrink-0 items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={addPage}
              aria-label="Tambah halaman"
            >
              <Plus />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Tambah halaman kosong</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={duplicatePage}
              aria-label="Duplikasi halaman"
            >
              <Copy />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Duplikasi halaman ini</TooltipContent>
        </Tooltip>

        {canRemove && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={remove}
                aria-label="Hapus halaman"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Hapus halaman ini</TooltipContent>
          </Tooltip>
        )}

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Sequential navigation next to the list, because a strip is a place
            where "the one before this" is a real thought — and on a narrow
            screen it beats scrolling the row to find the neighbour. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => step(-1)}
              disabled={index <= 0}
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Halaman sebelumnya (Alt+←)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => step(1)}
              disabled={index === -1 || index >= pages.length - 1}
              aria-label="Halaman berikutnya"
            >
              <ChevronRight />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Halaman berikutnya (Alt+→)</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-6" />
      </div>

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
            <PageThumbnail
              page={page}
              className={cn(
                "border-editor-border bg-editor-stage shrink-0 rounded-sm border",
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
