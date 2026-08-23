import type { ParticleSpec } from "@/lib/editor/filters";

/**
 * Draws a particle field as a seamlessly tileable canvas.
 *
 * The stage paints weather by repeating one tile and sliding it, so the tile has
 * to wrap: every speck that pokes past an edge is drawn again on the opposite
 * side. Positions come from a fixed seed rather than `Math.random`, so the same
 * effect looks the same on every render and across a reload — a photostrip that
 * reshuffles its snow each repaint would read as a glitch.
 */

/** Tile edge in design px. Big enough to hide the repeat, small to keep cheap. */
const TILE = 160;

/** Deterministic 0–1 stream (mulberry32) — same seed, same field, every time. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How many specks a tile needs to hit the spec's spacing. */
function countFor(spec: ParticleSpec): number {
  const perAxis = Math.max(1, Math.round(TILE / spec.spacing));
  return Math.min(900, perAxis * perAxis);
}

export function particleTile(spec: ParticleSpec, seed = 1): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = TILE;
  canvas.height = TILE;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const random = seeded(seed);
  const count = countFor(spec);
  // Streaks lean with the fall; the tilt is measured from vertical.
  const radians = (spec.tilt * Math.PI) / 180;
  const streakX = Math.sin(radians) * spec.streak * spec.spacing;
  const streakY = Math.cos(radians) * spec.streak * spec.spacing;

  ctx.strokeStyle = spec.color;
  ctx.fillStyle = spec.color;
  ctx.lineCap = "round";

  for (let i = 0; i < count; i += 1) {
    const x = random() * TILE;
    const y = random() * TILE;
    // Vary each speck a little so the field does not look stamped.
    const scale = 0.7 + random() * 0.6;

    // Draw at the four wrapped positions so specks crossing an edge continue on
    // the other side; off-tile copies are clipped away for free.
    for (const [dx, dy] of [
      [0, 0],
      [-TILE, 0],
      [0, -TILE],
      [-TILE, -TILE],
    ]) {
      const px = x + dx;
      const py = y + dy;

      if (spec.streak > 0) {
        ctx.lineWidth = spec.size * scale * 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + streakX * scale, py + streakY * scale);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(px, py, spec.size * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  return canvas;
}

export const PARTICLE_TILE_SIZE = TILE;

/**
 * How far the field has travelled at a given time.
 *
 * Falling is a straight slide along the tilt; wrapping the offset into one tile
 * keeps the numbers small no matter how long the editor has been open, and the
 * motion stays seamless because the tile repeats.
 */
export function particleOffset(
  spec: ParticleSpec,
  elapsedMs: number,
): { x: number; y: number } {
  const radians = (spec.tilt * Math.PI) / 180;
  const distance = (spec.speed * elapsedMs) / 1000;
  return {
    x: (Math.sin(radians) * distance) % TILE,
    y: (Math.cos(radians) * distance) % TILE,
  };
}
