import type { CanvasObject } from "@/types/editor";

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A guide line to draw while dragging, in page coordinates. */
export interface SnapGuide {
  axis: "x" | "y";
  position: number;
}

export interface SnapResult {
  /** Correction to add to the dragged box to land it on a guide. */
  dx: number;
  dy: number;
  guides: SnapGuide[];
}

/**
 * Axis-aligned bounds of an object.
 *
 * Rotation is deliberately ignored: snapping a rotated element to its own
 * unrotated box is what design tools do, and it keeps the guides predictable.
 */
export function objectBox(object: CanvasObject): Box {
  return {
    x: object.x,
    y: object.y,
    width: object.width,
    height: object.height,
  };
}

/** Left / centre / right (or top / middle / bottom) of a box. */
function edges(box: Box, axis: "x" | "y"): number[] {
  return axis === "x"
    ? [box.x, box.x + box.width / 2, box.x + box.width]
    : [box.y, box.y + box.height / 2, box.y + box.height];
}

function snapAxis(
  moving: Box,
  targets: Box[],
  pageSize: number,
  axis: "x" | "y",
  threshold: number,
): { delta: number; guide: SnapGuide | null } {
  const movingEdges = edges(moving, axis);
  const candidates = [
    0,
    pageSize / 2,
    pageSize,
    ...targets.flatMap((target) => edges(target, axis)),
  ];

  let best: { delta: number; guide: SnapGuide } | null = null;

  for (const movingEdge of movingEdges) {
    for (const candidate of candidates) {
      const distance = Math.abs(candidate - movingEdge);
      if (distance > threshold) continue;
      if (best && distance >= Math.abs(best.delta)) continue;

      best = {
        delta: candidate - movingEdge,
        guide: { axis, position: candidate },
      };
    }
  }

  return best ?? { delta: 0, guide: null };
}

/**
 * Nudges `moving` onto the nearest alignment guide within `threshold`, measured
 * against the page edges/centre and every other object's edges/centre.
 *
 * All values are page coordinates, so callers should scale the threshold by the
 * current zoom to keep the pull constant in screen pixels.
 */
export function computeSnap(
  moving: Box,
  targets: Box[],
  page: { width: number; height: number },
  threshold: number,
): SnapResult {
  const x = snapAxis(moving, targets, page.width, "x", threshold);
  const y = snapAxis(moving, targets, page.height, "y", threshold);

  return {
    dx: x.delta,
    dy: y.delta,
    guides: [x.guide, y.guide].filter((guide): guide is SnapGuide => !!guide),
  };
}

/** Smallest box containing all the given boxes. */
export function unionBox(boxes: Box[]): Box {
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));

  return { x: left, y: top, width: right - left, height: bottom - top };
}
