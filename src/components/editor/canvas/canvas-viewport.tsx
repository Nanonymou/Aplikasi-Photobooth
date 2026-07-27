"use client";

import dynamic from "next/dynamic";

/**
 * Konva talks to a real `<canvas>` and has no server renderer, so the stage is
 * loaded client-side only. The fallback keeps the editor layout from collapsing
 * while the chunk downloads.
 */
const CanvasStage = dynamic(
  () => import("./canvas-stage").then((mod) => mod.CanvasStage),
  {
    ssr: false,
    loading: () => (
      <div className="stage-checkerboard flex h-full w-full items-center justify-center">
        <div className="bg-editor-chrome/80 text-muted-foreground rounded-full px-4 py-2 text-xs font-medium shadow-sm">
          Menyiapkan kanvas…
        </div>
      </div>
    ),
  },
);

export function CanvasViewport() {
  return <CanvasStage />;
}
