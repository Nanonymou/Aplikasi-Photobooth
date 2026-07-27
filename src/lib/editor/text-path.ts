/**
 * SVG path for a curved text baseline.
 *
 * The chord is `width` wide so curved text keeps the same footprint as straight
 * text at the same size. `curve` is the arc it subtends in degrees: positive
 * bulges upward, negative downward, 0 is a straight line.
 */
export function arcPathData(width: number, curve: number): string {
  const degrees = Math.max(-350, Math.min(350, curve));

  if (Math.abs(degrees) < 0.5) {
    return `M 0 0 L ${width} 0`;
  }

  const theta = (Math.abs(degrees) * Math.PI) / 180;
  const radius = width / (2 * Math.sin(theta / 2));
  // Height of the bulge, used to keep the arc inside the object's box.
  const sagitta = radius * (1 - Math.cos(theta / 2));

  const up = degrees > 0;
  // In SVG the y axis points down, so an upward bulge sweeps counter-clockwise.
  const sweep = up ? 0 : 1;
  const largeArc = theta > Math.PI ? 1 : 0;
  const baseline = up ? sagitta : 0;

  return `M 0 ${baseline} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${width} ${baseline}`;
}

/** Vertical space a curved baseline needs, so the box can be sized to fit. */
export function arcHeight(width: number, curve: number): number {
  const degrees = Math.abs(Math.max(-350, Math.min(350, curve)));
  if (degrees < 0.5) return 0;

  const theta = (degrees * Math.PI) / 180;
  const radius = width / (2 * Math.sin(theta / 2));
  return radius * (1 - Math.cos(theta / 2));
}
