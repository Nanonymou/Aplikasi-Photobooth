export type PatternId =
  | "titik"
  | "kotak"
  | "garis"
  | "papan-catur"
  | "konfeti"
  | "hati";

export interface PatternDefinition {
  id: PatternId;
  label: string;
  /** Tile size in pattern units; the tile is always square. */
  tile: number;
  /** Marks drawn on top of the background colour. */
  draw: (foreground: string) => string;
}

/**
 * Tileable background patterns, defined as SVG so the same source can paint the
 * Konva canvas (as a pattern image) and the CSS previews in the panel.
 */
export const PATTERNS: PatternDefinition[] = [
  {
    id: "titik",
    label: "Titik",
    tile: 40,
    draw: (fg) => `<circle cx="20" cy="20" r="4" fill="${fg}"/>`,
  },
  {
    id: "kotak",
    label: "Kotak",
    tile: 40,
    draw: (fg) =>
      `<path d="M0 0H40M0 20H40M0 0V40M20 0V40" stroke="${fg}" stroke-width="2" fill="none"/>`,
  },
  {
    id: "garis",
    label: "Garis miring",
    tile: 40,
    draw: (fg) =>
      `<path d="M-10 10L10 -10M0 40L40 0M30 50L50 30" stroke="${fg}" stroke-width="6" fill="none"/>`,
  },
  {
    id: "papan-catur",
    label: "Papan catur",
    tile: 40,
    draw: (fg) =>
      `<rect width="20" height="20" fill="${fg}"/><rect x="20" y="20" width="20" height="20" fill="${fg}"/>`,
  },
  {
    id: "konfeti",
    label: "Konfeti",
    tile: 60,
    draw: (fg) =>
      `<rect x="6" y="10" width="10" height="4" rx="2" fill="${fg}" transform="rotate(25 11 12)"/>` +
      `<rect x="38" y="26" width="10" height="4" rx="2" fill="${fg}" transform="rotate(-40 43 28)"/>` +
      `<rect x="20" y="44" width="10" height="4" rx="2" fill="${fg}" transform="rotate(70 25 46)"/>`,
  },
  {
    id: "hati",
    label: "Hati kecil",
    tile: 48,
    draw: (fg) =>
      `<path d="M24 34c-8-6-13-10-13-16a6 6 0 0 1 11-3 6 6 0 0 1 11 3c0 6-5 10-13 16z" fill="${fg}"/>`,
  },
];

export function getPattern(id: PatternId): PatternDefinition {
  const pattern = PATTERNS.find((item) => item.id === id);
  if (!pattern) throw new Error(`Unknown pattern: ${id}`);
  return pattern;
}

/** One tile of the pattern as a standalone SVG document. */
export function patternSvg(
  id: PatternId,
  foreground: string,
  background: string,
): string {
  const pattern = getPattern(id);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pattern.tile}" height="${pattern.tile}" viewBox="0 0 ${pattern.tile} ${pattern.tile}">` +
    `<rect width="${pattern.tile}" height="${pattern.tile}" fill="${background}"/>` +
    pattern.draw(foreground) +
    `</svg>`
  );
}

/**
 * The tile as a data URI.
 *
 * `encodeURIComponent` rather than base64: it keeps the markup readable in
 * devtools and avoids the ~33% size increase for what is only a few hundred
 * bytes of SVG.
 */
export function patternDataUri(
  id: PatternId,
  foreground: string,
  background: string,
): string {
  const svg = patternSvg(id, foreground, background);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Checkerboard that signals "no background".
 *
 * Built through `patternDataUri` rather than as its own SVG string on purpose:
 * a hand-rolled literal here is fully statically known, and the production
 * minifier constant-folds such template concatenations incorrectly — it dropped
 * whole `" fill="..."/>` runs and emitted malformed SVG that failed to decode.
 * Routing through the shared builder keeps one proven code path.
 */
export function transparencyCheckerDataUri(): string {
  return patternDataUri("papan-catur", "#e2e8f0", "#ffffff");
}

/** Tile size of the transparency checker, for CSS previews. */
export const TRANSPARENCY_TILE_SIZE = getPattern("papan-catur").tile;
