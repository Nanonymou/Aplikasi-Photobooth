/**
 * The filter and effect catalogue.
 *
 * Two different things share this panel because they answer the same question —
 * "how should this photo look?" — but they work differently: a **filter** is a
 * colour treatment, expressible as a CSS `filter` string, so a preview and the
 * final render agree by construction. An **effect** is something laid *over* the
 * photo (grain, a light leak, falling snow), so it carries a CSS background layer
 * and a blend mode instead.
 *
 * Keeping both as plain data means the panel, the canvas, and the exporter read
 * one source rather than each hard-coding its own list.
 */

export interface PhotoFilter {
  id: string;
  label: string;
  /** A CSS `filter` value; empty means the untouched photo. */
  css: string;
}

/** Ordered as the panel shows them: the original first, then warm → cool → mono. */
export const PHOTO_FILTERS: PhotoFilter[] = [
  { id: "none", label: "Asli", css: "" },
  { id: "cerah", label: "Cerah", css: "brightness(1.12) contrast(1.05)" },
  { id: "lembut", label: "Lembut", css: "brightness(1.06) saturate(0.9) contrast(0.95)" },
  { id: "hangat", label: "Hangat", css: "sepia(0.25) saturate(1.25) hue-rotate(-10deg)" },
  { id: "senja", label: "Senja", css: "sepia(0.4) saturate(1.4) hue-rotate(-18deg) brightness(1.05)" },
  { id: "dingin", label: "Dingin", css: "saturate(1.1) hue-rotate(15deg) brightness(1.03)" },
  { id: "drama", label: "Drama", css: "contrast(1.35) saturate(1.15) brightness(0.95)" },
  { id: "matte", label: "Matte", css: "contrast(0.88) saturate(0.85) brightness(1.08)" },
  { id: "vintage", label: "Vintage", css: "sepia(0.45) contrast(1.1) saturate(0.8)" },
  { id: "retro", label: "Retro", css: "sepia(0.3) hue-rotate(-25deg) saturate(1.5) contrast(1.1)" },
  { id: "sepia", label: "Sepia", css: "sepia(0.85)" },
  { id: "mono", label: "Hitam putih", css: "grayscale(1) contrast(1.1)" },
];

export const DEFAULT_FILTER = PHOTO_FILTERS[0];

export function getFilter(id: string): PhotoFilter {
  return PHOTO_FILTERS.find((filter) => filter.id === id) ?? DEFAULT_FILTER;
}

export interface VisualEffect {
  id: string;
  label: string;
  /** What it reads as, one line — the panel shows it under the name. */
  hint: string;
  /** CSS `background` for the overlay layer painted above the photo. */
  overlay: string;
  /** How that layer blends with the photo. */
  blend: "screen" | "overlay" | "soft-light" | "multiply" | "lighten";
  /** 0–1 starting strength; the strength control is a later task. */
  opacity: number;
}

/**
 * Overlays, as CSS. Grain and confetti are repeating radial dots at different
 * scales; leaks and glow are large soft gradients — enough to read correctly in
 * a preview and to hand the renderer a real description rather than a name.
 */
export const VISUAL_EFFECTS: VisualEffect[] = [
  {
    id: "bokeh",
    label: "Bokeh",
    hint: "Bulatan cahaya lembut",
    overlay:
      "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.5) 0 6px, transparent 7px), radial-gradient(circle at 70% 20%, rgba(255,255,255,0.35) 0 10px, transparent 11px), radial-gradient(circle at 45% 75%, rgba(255,255,255,0.4) 0 8px, transparent 9px), radial-gradient(circle at 85% 65%, rgba(255,255,255,0.3) 0 12px, transparent 13px)",
    blend: "screen",
    opacity: 0.7,
  },
  {
    id: "grain",
    label: "Film grain",
    hint: "Butiran ala film analog",
    overlay:
      "radial-gradient(circle, rgba(255,255,255,0.22) 0 0.5px, transparent 0.6px) 0 0 / 3px 3px",
    blend: "overlay",
    opacity: 0.5,
  },
  {
    id: "light-leak",
    label: "Light leak",
    hint: "Bocoran cahaya di tepi",
    overlay:
      "linear-gradient(115deg, rgba(255,138,76,0.75) 0%, rgba(255,196,120,0.35) 25%, transparent 55%)",
    blend: "screen",
    opacity: 0.65,
  },
  {
    id: "glow",
    label: "Glow",
    hint: "Cahaya hangat menyebar",
    overlay:
      "radial-gradient(circle at 50% 40%, rgba(255,240,200,0.65) 0%, transparent 65%)",
    blend: "soft-light",
    opacity: 0.75,
  },
  {
    id: "confetti",
    label: "Confetti",
    hint: "Serpihan warna perayaan",
    overlay:
      "radial-gradient(circle at 15% 20%, #f43f5e 0 3px, transparent 4px), radial-gradient(circle at 60% 15%, #facc15 0 3px, transparent 4px), radial-gradient(circle at 35% 60%, #38bdf8 0 3px, transparent 4px), radial-gradient(circle at 80% 45%, #a855f7 0 3px, transparent 4px), radial-gradient(circle at 25% 85%, #34d399 0 3px, transparent 4px)",
    blend: "lighten",
    opacity: 0.9,
  },
  {
    id: "rain",
    label: "Rain",
    hint: "Guratan hujan tipis",
    overlay:
      "repeating-linear-gradient(105deg, rgba(255,255,255,0.35) 0 1px, transparent 1px 9px)",
    blend: "screen",
    opacity: 0.45,
  },
  {
    id: "snow",
    label: "Snow",
    hint: "Butiran salju berjatuhan",
    overlay:
      "radial-gradient(circle, rgba(255,255,255,0.9) 0 1.4px, transparent 2px) 0 0 / 14px 14px, radial-gradient(circle, rgba(255,255,255,0.6) 0 1px, transparent 1.6px) 7px 9px / 22px 22px",
    blend: "screen",
    opacity: 0.7,
  },
  {
    id: "smoke",
    label: "Smoke",
    hint: "Kabut tipis menyapu",
    overlay:
      "linear-gradient(160deg, rgba(226,232,240,0.55) 0%, transparent 45%), radial-gradient(ellipse at 70% 80%, rgba(203,213,225,0.5) 0%, transparent 60%)",
    blend: "soft-light",
    opacity: 0.6,
  },
];

export function getEffect(id: string): VisualEffect | null {
  return VISUAL_EFFECTS.find((effect) => effect.id === id) ?? null;
}
