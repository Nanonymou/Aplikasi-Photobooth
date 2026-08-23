import type { LinearGradient } from "@/types/editor";

/**
 * Konva linear-gradient geometry, from a CSS-style angle.
 *
 * Konva wants two points; CSS thinks in degrees. This converts one to the other
 * with CSS's convention — 0° points up, growing clockwise — and sizes the line so
 * the gradient spans the whole box at any angle rather than running out early in
 * the corners. Shared by text and photo slots so both read an angle the same way.
 */
export function gradientPoints(
  gradient: LinearGradient,
  width: number,
  height: number,
) {
  const radians = ((gradient.angle - 90) * Math.PI) / 180;
  const dx = Math.cos(radians);
  const dy = Math.sin(radians);
  const length = Math.abs(width * dx) + Math.abs(height * dy);

  return {
    start: {
      x: width / 2 - (dx * length) / 2,
      y: height / 2 - (dy * length) / 2,
    },
    end: {
      x: width / 2 + (dx * length) / 2,
      y: height / 2 + (dy * length) / 2,
    },
    stops: [0, gradient.from, 1, gradient.to] as (number | string)[],
  };
}

/** Konva props that fill a shape with the gradient. */
export function gradientFillProps(
  gradient: LinearGradient,
  width: number,
  height: number,
) {
  const { start, end, stops } = gradientPoints(gradient, width, height);
  return {
    fillLinearGradientStartPoint: start,
    fillLinearGradientEndPoint: end,
    fillLinearGradientColorStops: stops,
  };
}

/** Konva props that stroke a shape with the gradient — used by slot borders. */
export function gradientStrokeProps(
  gradient: LinearGradient,
  width: number,
  height: number,
) {
  const { start, end, stops } = gradientPoints(gradient, width, height);
  return {
    strokeLinearGradientStartPoint: start,
    strokeLinearGradientEndPoint: end,
    strokeLinearGradientColorStops: stops,
  };
}
