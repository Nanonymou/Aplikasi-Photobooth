"use client";

import { Maximize, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEditorStore } from "@/store/editor-store";

/** Zoom controls plus the page position readout, pinned under the stage. */
export function StatusBar() {
  const zoom = useEditorStore((state) => state.zoom);
  const zoomMode = useEditorStore((state) => state.zoomMode);
  const zoomIn = useEditorStore((state) => state.zoomIn);
  const zoomOut = useEditorStore((state) => state.zoomOut);
  const zoomToFit = useEditorStore((state) => state.zoomToFit);
  const resetZoom = useEditorStore((state) => state.resetZoom);

  const pages = useEditorStore((state) => state.project.pages);
  const activePageId = useEditorStore((state) => state.activePageId);
  const activeIndex = pages.findIndex((page) => page.id === activePageId);

  return (
    <div className="bg-editor-chrome border-editor-border flex h-10 shrink-0 items-center gap-2 border-t px-3">
      <span className="text-muted-foreground text-xs tabular-nums">
        Halaman {activeIndex + 1} / {pages.length}
      </span>

      <div className="ml-auto flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={zoomToFit}
              aria-label="Sesuaikan ke layar"
              aria-pressed={zoomMode === "fit"}
            >
              <Maximize />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Sesuaikan ke layar (Ctrl+0)</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={zoomOut}
          aria-label="Perkecil"
        >
          <Minus />
        </Button>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetZoom}
              className="w-16 tabular-nums"
            >
              {Math.round(zoom * 100)}%
            </Button>
          </TooltipTrigger>
          <TooltipContent>Kembali ke 100% (Ctrl+1)</TooltipContent>
        </Tooltip>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={zoomIn}
          aria-label="Perbesar"
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}
