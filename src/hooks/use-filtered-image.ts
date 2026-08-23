"use client";

import { useMemo } from "react";

import { useImage } from "@/hooks/use-image";

/**
 * Applies a CSS filter to a loaded image, for Konva.
 *
 * Konva draws `HTMLImageElement`s and knows nothing about CSS filters, but the
 * 2D context does: `ctx.filter` takes the very same syntax the panel previews
 * with. So rather than re-implementing each filter against Konva's own
 * primitives — and drifting from the preview — the image is redrawn into an
 * offscreen canvas with the filter set, and Konva is handed that canvas. What
 * you picked is pixel-for-pixel what the stage shows.
 *
 * The redraw is synchronous work on an already-decoded image, so it belongs in a
 * memo rather than an effect: no extra render, and no window where the stage
 * holds a stale frame. Falls back to the plain image when there is no filter, or
 * on a browser whose canvas ignores `ctx.filter`, so a missing feature degrades
 * to the untouched photo rather than to nothing.
 */
export function useFilteredImage(
  src: string | undefined | null,
  css: string | undefined,
): HTMLImageElement | HTMLCanvasElement | null {
  const image = useImage(src);

  return useMemo(() => {
    if (!image || !css) return image;

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;

    const ctx = canvas.getContext("2d");
    if (!ctx || !("filter" in ctx)) return image;

    ctx.filter = css;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  }, [image, css]);
}
