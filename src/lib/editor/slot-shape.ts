import type { Context } from "konva/lib/Context";

import type { SlotShape } from "@/types/editor";

/** Control-point ratio that turns a cubic Bézier into a quarter circle. */
const KAPPA = 0.5522847498307936;

export type PathCommand =
  | { type: "move"; x: number; y: number }
  | { type: "line"; x: number; y: number }
  | {
      type: "cubic";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      x: number;
      y: number;
    }
  | { type: "close" };

export interface SlotShapeDefinition {
  id: SlotShape;
  label: string;
}

/** Shapes offered by the frame builder, in picker order. */
export const SLOT_SHAPES: SlotShapeDefinition[] = [
  { id: "rect", label: "Persegi" },
  { id: "circle", label: "Lingkaran" },
  { id: "polaroid", label: "Polaroid" },
  { id: "heart", label: "Hati" },
  { id: "hexagon", label: "Hexagon" },
  { id: "diamond", label: "Diamond" },
  { id: "star", label: "Bintang" },
];

/**
 * Fraction of a polaroid's box taken up by the photo window. The wide bottom
 * margin is what makes it read as a polaroid.
 */
export const POLAROID_WINDOW = {
  inset: 0.06,
  bottom: 0.82,
} as const;

function polygon(points: Array<[number, number]>): PathCommand[] {
  const [first, ...rest] = points;

  return [
    { type: "move", x: first[0], y: first[1] },
    ...rest.map(
      ([x, y]) => ({ type: "line", x, y }) satisfies PathCommand,
    ),
    { type: "close" },
  ];
}

function roundedRect(
  x: number,
  y: number,
  width: number,
  height: number,
  cornerRadius: number,
): PathCommand[] {
  const r = Math.max(0, Math.min(cornerRadius, width / 2, height / 2));
  const right = x + width;
  const bottom = y + height;

  if (r === 0) {
    return polygon([
      [x, y],
      [right, y],
      [right, bottom],
      [x, bottom],
    ]);
  }

  const c = r * KAPPA;

  return [
    { type: "move", x: x + r, y },
    { type: "line", x: right - r, y },
    { type: "cubic", x1: right - r + c, y1: y, x2: right, y2: y + r - c, x: right, y: y + r },
    { type: "line", x: right, y: bottom - r },
    { type: "cubic", x1: right, y1: bottom - r + c, x2: right - r + c, y2: bottom, x: right - r, y: bottom },
    { type: "line", x: x + r, y: bottom },
    { type: "cubic", x1: x + r - c, y1: bottom, x2: x, y2: bottom - r + c, x, y: bottom - r },
    { type: "line", x, y: y + r },
    { type: "cubic", x1: x, y1: y + r - c, x2: x + r - c, y2: y, x: x + r, y },
    { type: "close" },
  ];
}

function ellipse(width: number, height: number): PathCommand[] {
  const rx = width / 2;
  const ry = height / 2;
  const cx = rx;
  const cy = ry;
  const ox = rx * KAPPA;
  const oy = ry * KAPPA;

  return [
    { type: "move", x: cx + rx, y: cy },
    { type: "cubic", x1: cx + rx, y1: cy + oy, x2: cx + ox, y2: cy + ry, x: cx, y: cy + ry },
    { type: "cubic", x1: cx - ox, y1: cy + ry, x2: cx - rx, y2: cy + oy, x: cx - rx, y: cy },
    { type: "cubic", x1: cx - rx, y1: cy - oy, x2: cx - ox, y2: cy - ry, x: cx, y: cy - ry },
    { type: "cubic", x1: cx + ox, y1: cy - ry, x2: cx + rx, y2: cy - oy, x: cx + rx, y: cy },
    { type: "close" },
  ];
}

function heart(width: number, height: number): PathCommand[] {
  const w = width;
  const h = height;

  return [
    { type: "move", x: w * 0.5, y: h * 0.28 },
    { type: "cubic", x1: w * 0.5, y1: h * 0.08, x2: w * 0.08, y2: h * 0.04, x: w * 0.05, y: h * 0.33 },
    { type: "cubic", x1: w * 0.02, y1: h * 0.56, x2: w * 0.26, y2: h * 0.73, x: w * 0.5, y: h * 0.97 },
    { type: "cubic", x1: w * 0.74, y1: h * 0.73, x2: w * 0.98, y2: h * 0.56, x: w * 0.95, y: h * 0.33 },
    { type: "cubic", x1: w * 0.92, y1: h * 0.04, x2: w * 0.5, y2: h * 0.08, x: w * 0.5, y: h * 0.28 },
    { type: "close" },
  ];
}

function star(width: number, height: number, points = 5): PathCommand[] {
  const rx = width / 2;
  const ry = height / 2;
  const vertices: Array<[number, number]> = [];

  for (let index = 0; index < points * 2; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI) / points;
    const scale = index % 2 === 0 ? 1 : 0.382;
    vertices.push([rx + rx * scale * Math.cos(angle), ry + ry * scale * Math.sin(angle)]);
  }

  return polygon(vertices);
}

/**
 * Outline of a photo slot in local coordinates (0,0 → width,height).
 *
 * Defined once as path commands so the Konva canvas and the SVG shape previews
 * in the frame builder can never drift apart.
 */
export function slotPathCommands(
  shape: SlotShape,
  width: number,
  height: number,
  cornerRadius = 0,
): PathCommand[] {
  switch (shape) {
    case "circle":
      return ellipse(width, height);

    case "heart":
      return heart(width, height);

    case "star":
      return star(width, height);

    case "hexagon":
      return polygon([
        [width * 0.5, 0],
        [width, height * 0.25],
        [width, height * 0.75],
        [width * 0.5, height],
        [0, height * 0.75],
        [0, height * 0.25],
      ]);

    case "diamond":
      return polygon([
        [width * 0.5, 0],
        [width, height * 0.5],
        [width * 0.5, height],
        [0, height * 0.5],
      ]);

    case "polaroid":
      return roundedRect(
        width * POLAROID_WINDOW.inset,
        height * POLAROID_WINDOW.inset,
        width * (1 - POLAROID_WINDOW.inset * 2),
        height * (POLAROID_WINDOW.bottom - POLAROID_WINDOW.inset),
        Math.min(cornerRadius, width * 0.04),
      );

    case "rect":
      return roundedRect(0, 0, width, height, cornerRadius);
  }
}

/** Replays path commands into a Konva/canvas context, e.g. as a `clipFunc`. */
export function traceSlotPath(
  ctx: Context | CanvasRenderingContext2D,
  shape: SlotShape,
  width: number,
  height: number,
  cornerRadius = 0,
): void {
  ctx.beginPath();

  for (const command of slotPathCommands(shape, width, height, cornerRadius)) {
    switch (command.type) {
      case "move":
        ctx.moveTo(command.x, command.y);
        break;
      case "line":
        ctx.lineTo(command.x, command.y);
        break;
      case "cubic":
        ctx.bezierCurveTo(
          command.x1,
          command.y1,
          command.x2,
          command.y2,
          command.x,
          command.y,
        );
        break;
      case "close":
        ctx.closePath();
        break;
    }
  }
}

/** Same geometry as an SVG `d` attribute, for the shape previews. */
export function slotPathData(
  shape: SlotShape,
  width: number,
  height: number,
  cornerRadius = 0,
): string {
  return slotPathCommands(shape, width, height, cornerRadius)
    .map((command) => {
      switch (command.type) {
        case "move":
          return `M${command.x.toFixed(2)} ${command.y.toFixed(2)}`;
        case "line":
          return `L${command.x.toFixed(2)} ${command.y.toFixed(2)}`;
        case "cubic":
          return `C${command.x1.toFixed(2)} ${command.y1.toFixed(2)} ${command.x2.toFixed(2)} ${command.y2.toFixed(2)} ${command.x.toFixed(2)} ${command.y.toFixed(2)}`;
        case "close":
          return "Z";
      }
    })
    .join(" ");
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
