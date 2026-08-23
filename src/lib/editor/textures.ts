/**
 * Frame textures, drawn rather than downloaded.
 *
 * A texture is a small seamless tile the border is stroked with. They are
 * generated in code instead of shipped as images for three reasons: nothing to
 * load (so a texture appears the instant it is picked), no resolution ceiling
 * (the same tile is redrawn at export size), and the palette is a parameter —
 * "gold linen" is the linen routine with a different pair of colours.
 *
 * Every tile wraps: a stroke crossing an edge is drawn again on the far side, so
 * repeating it shows no seam.
 */

export interface FrameTexture {
  id: string;
  label: string;
  /** Colours the tile is drawn from: base fill first, then its markings. */
  base: string;
  accent: string;
  kind: "kertas" | "kayu" | "linen" | "kilau" | "marmer";
}

export const FRAME_TEXTURES: FrameTexture[] = [
  { id: "kertas", label: "Kertas", kind: "kertas", base: "#faf7f2", accent: "#d8cfc2" },
  { id: "kraft", label: "Kraft", kind: "kertas", base: "#d8b98c", accent: "#9c7b4f" },
  { id: "kayu", label: "Kayu", kind: "kayu", base: "#c08b4f", accent: "#8a5a2b" },
  { id: "linen", label: "Linen", kind: "linen", base: "#f3efe7", accent: "#cfc6b6" },
  { id: "emas", label: "Emas", kind: "kilau", base: "#d9a441", accent: "#fff3c4" },
  { id: "perak", label: "Perak", kind: "kilau", base: "#b9bfc7", accent: "#ffffff" },
  { id: "marmer", label: "Marmer", kind: "marmer", base: "#f6f5f3", accent: "#b9b4ad" },
];

/** Tile edge in design px — large enough to hide the repeat, small to stay cheap. */
const TILE = 96;

/** Deterministic 0–1 stream (mulberry32): the same texture every render. */
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

/** Runs `draw` at the four wrapped offsets so marks continue across the seam. */
function wrapped(
  ctx: CanvasRenderingContext2D,
  draw: (dx: number, dy: number) => void,
) {
  for (const [dx, dy] of [
    [0, 0],
    [-TILE, 0],
    [0, -TILE],
    [-TILE, -TILE],
  ]) {
    draw(dx, dy);
  }
}

/**
 * Tiles are pure functions of their texture and get redrawn on every canvas
 * frame, so each one is built once and kept.
 */
const tileCache = new Map<string, HTMLCanvasElement>();

export function textureTile(texture: FrameTexture): HTMLCanvasElement {
  const cached = tileCache.get(texture.id);
  if (cached) return cached;

  const tile = drawTile(texture);
  tileCache.set(texture.id, tile);
  return tile;
}

function drawTile(texture: FrameTexture): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = TILE;
  canvas.height = TILE;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = texture.base;
  ctx.fillRect(0, 0, TILE, TILE);

  const random = seeded(7);
  ctx.strokeStyle = texture.accent;
  ctx.fillStyle = texture.accent;

  switch (texture.kind) {
    case "kertas": {
      // Fibre flecks: many tiny, faint dots.
      ctx.globalAlpha = 0.35;
      for (let i = 0; i < 700; i += 1) {
        const x = random() * TILE;
        const y = random() * TILE;
        ctx.fillRect(x, y, 1, 1);
      }
      break;
    }

    case "kayu": {
      // Grain: near-horizontal lines that wander, plus darker rings.
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1;
      for (let y = 0; y < TILE; y += 3) {
        wrapped(ctx, (dx, dy) => {
          ctx.beginPath();
          ctx.moveTo(dx, y + dy);
          for (let x = 0; x <= TILE; x += 8) {
            ctx.lineTo(x + dx, y + dy + Math.sin(x / 11 + y) * 1.4);
          }
          ctx.stroke();
        });
      }
      break;
    }

    case "linen": {
      // Weave: a warp and weft grid, each thread slightly uneven.
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1;
      for (let i = 0; i < TILE; i += 4) {
        ctx.globalAlpha = 0.25 + random() * 0.3;
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, TILE);
        ctx.moveTo(0, i);
        ctx.lineTo(TILE, i);
        ctx.stroke();
      }
      break;
    }

    case "kilau": {
      // Metal: a diagonal sheen with scattered highlights on top.
      const sheen = ctx.createLinearGradient(0, 0, TILE, TILE);
      sheen.addColorStop(0, texture.base);
      sheen.addColorStop(0.45, texture.accent);
      sheen.addColorStop(0.55, texture.base);
      sheen.addColorStop(1, texture.accent);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = sheen;
      ctx.fillRect(0, 0, TILE, TILE);

      ctx.globalAlpha = 0.7;
      ctx.fillStyle = texture.accent;
      for (let i = 0; i < 60; i += 1) {
        const x = random() * TILE;
        const y = random() * TILE;
        const r = 0.4 + random() * 1.1;
        wrapped(ctx, (dx, dy) => {
          ctx.beginPath();
          ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      break;
    }

    case "marmer": {
      // Veins: a few long, soft, forking strokes.
      ctx.globalAlpha = 0.4;
      ctx.lineCap = "round";
      for (let i = 0; i < 7; i += 1) {
        const startY = random() * TILE;
        ctx.lineWidth = 0.6 + random() * 2;
        wrapped(ctx, (dx, dy) => {
          ctx.beginPath();
          ctx.moveTo(dx, startY + dy);
          for (let x = 0; x <= TILE; x += 12) {
            ctx.lineTo(
              x + dx,
              startY + dy + Math.sin(x / 17 + i * 2) * 9 + (x / TILE) * 12,
            );
          }
          ctx.stroke();
        });
      }
      break;
    }
  }

  ctx.globalAlpha = 1;
  return canvas;
}

export function getTexture(id: string | undefined): FrameTexture | null {
  if (!id) return null;
  return FRAME_TEXTURES.find((texture) => texture.id === id) ?? null;
}
