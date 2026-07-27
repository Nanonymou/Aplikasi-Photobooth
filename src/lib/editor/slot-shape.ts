import type { Context } from "konva/lib/Context";

import type { SlotShape } from "@/types/editor";

/**
 * Draws the outline of a photo slot into `ctx`, in local slot coordinates
 * (0,0 → width,height). Used both as a Konva `clipFunc` for the photo inside the
 * slot and as the path for the slot's border.
 *
 * Only the shapes the editor can currently produce are implemented; the richer
 * set (heart, hexagon, diamond, star, polaroid) arrives with the dynamic frame
 * builder and falls back to a rectangle until then.
 */
export function traceSlotPath(
  ctx: Context | CanvasRenderingContext2D,
  shape: SlotShape,
  width: number,
  height: number,
  cornerRadius = 0,
): void {
  ctx.beginPath();

  if (shape === "circle") {
    const radiusX = width / 2;
    const radiusY = height / 2;
    ctx.ellipse(radiusX, radiusY, radiusX, radiusY, 0, 0, Math.PI * 2, false);
    ctx.closePath();
    return;
  }

  const radius = Math.max(0, Math.min(cornerRadius, width / 2, height / 2));

  if (radius === 0) {
    ctx.rect(0, 0, width, height);
    ctx.closePath();
    return;
  }

  ctx.moveTo(radius, 0);
  ctx.lineTo(width - radius, 0);
  ctx.quadraticCurveTo(width, 0, width, radius);
  ctx.lineTo(width, height - radius);
  ctx.quadraticCurveTo(width, height, width - radius, height);
  ctx.lineTo(radius, height);
  ctx.quadraticCurveTo(0, height, 0, height - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
}

/**
 * Scale needed for a photo to cover the slot without letterboxing, mirroring
 * `object-fit: cover`.
 */
export function coverScale(
  slotWidth: number,
  slotHeight: number,
  imageWidth: number,
  imageHeight: number,
): number {
  if (!imageWidth || !imageHeight) return 1;
  return Math.max(slotWidth / imageWidth, slotHeight / imageHeight);
}
