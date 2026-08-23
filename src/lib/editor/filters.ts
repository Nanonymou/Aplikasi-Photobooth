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

/**
 * Filter families, in the order the panel offers them.
 *
 * Categories are how a photographer actually looks for a treatment — "something
 * cinematic", "something black and white" — so the list is grouped rather than a
 * flat wall of a few dozen names.
 */
export type FilterCategory =
  | "dasar"
  | "potret"
  | "sinematik"
  | "vintage"
  | "monokrom";

export const FILTER_CATEGORIES: { id: FilterCategory; label: string }[] = [
  { id: "dasar", label: "Dasar" },
  { id: "potret", label: "Potret" },
  { id: "sinematik", label: "Sinematik" },
  { id: "vintage", label: "Vintage" },
  { id: "monokrom", label: "Monokrom" },
];

export interface PhotoFilter {
  id: string;
  label: string;
  category: FilterCategory;
  /** A CSS `filter` value; empty means the untouched photo. */
  css: string;
}

/**
 * The catalogue, grouped by family. Each entry is a stack of CSS primitives
 * tuned to a look a photographer would recognise, not a random tint: portrait
 * treatments keep skin warm and contrast gentle, cinematic ones crush contrast
 * and push a colour cast, vintage leans on sepia, monochrome varies where the
 * black point sits.
 */
export const PHOTO_FILTERS: PhotoFilter[] = [
  // Dasar — the original plus honest corrections.
  { id: "none", label: "Asli", category: "dasar", css: "" },
  { id: "cerah", label: "Cerah", category: "dasar", css: "brightness(1.12) contrast(1.05)" },
  { id: "lembut", label: "Lembut", category: "dasar", css: "brightness(1.06) saturate(0.9) contrast(0.95)" },
  { id: "tajam", label: "Tajam", category: "dasar", css: "contrast(1.2) saturate(1.1)" },
  { id: "pudar", label: "Pudar", category: "dasar", css: "contrast(0.85) brightness(1.12) saturate(0.8)" },

  // Potret — flattering skin: warm, gentle contrast, never crushed.
  { id: "hangat", label: "Hangat", category: "potret", css: "sepia(0.25) saturate(1.25) hue-rotate(-10deg)" },
  { id: "madu", label: "Madu", category: "potret", css: "sepia(0.3) saturate(1.3) brightness(1.06) contrast(0.98)" },
  { id: "porselen", label: "Porselen", category: "potret", css: "brightness(1.1) saturate(0.88) contrast(0.92)" },
  { id: "senja", label: "Senja", category: "potret", css: "sepia(0.4) saturate(1.4) hue-rotate(-18deg) brightness(1.05)" },
  { id: "blush", label: "Blush", category: "potret", css: "saturate(1.15) hue-rotate(-8deg) brightness(1.05) contrast(0.97)" },

  // Sinematik — a colour cast plus lifted or crushed contrast.
  { id: "teal-orange", label: "Teal orange", category: "sinematik", css: "contrast(1.2) saturate(1.3) hue-rotate(-12deg)" },
  { id: "drama", label: "Drama", category: "sinematik", css: "contrast(1.35) saturate(1.15) brightness(0.95)" },
  { id: "noir-biru", label: "Noir biru", category: "sinematik", css: "contrast(1.25) saturate(0.9) hue-rotate(20deg) brightness(0.95)" },
  { id: "matte", label: "Matte", category: "sinematik", css: "contrast(0.88) saturate(0.85) brightness(1.08)" },
  { id: "dingin", label: "Dingin", category: "sinematik", css: "saturate(1.1) hue-rotate(15deg) brightness(1.03)" },

  // Vintage — sepia-led, film-stock colour shifts.
  { id: "vintage", label: "Vintage", category: "vintage", css: "sepia(0.45) contrast(1.1) saturate(0.8)" },
  { id: "retro", label: "Retro", category: "vintage", css: "sepia(0.3) hue-rotate(-25deg) saturate(1.5) contrast(1.1)" },
  { id: "polaroid", label: "Polaroid", category: "vintage", css: "sepia(0.35) contrast(0.9) brightness(1.1) saturate(1.1)" },
  { id: "sepia", label: "Sepia", category: "vintage", css: "sepia(0.85)" },
  { id: "kodak", label: "Kodak", category: "vintage", css: "sepia(0.2) saturate(1.45) contrast(1.08) hue-rotate(-6deg)" },

  // Monokrom — where the black point and contrast sit.
  { id: "mono", label: "Hitam putih", category: "monokrom", css: "grayscale(1) contrast(1.1)" },
  { id: "mono-lembut", label: "Mono lembut", category: "monokrom", css: "grayscale(1) contrast(0.9) brightness(1.1)" },
  { id: "mono-keras", label: "Mono keras", category: "monokrom", css: "grayscale(1) contrast(1.6) brightness(0.95)" },
  { id: "mono-hangat", label: "Mono hangat", category: "monokrom", css: "grayscale(1) sepia(0.3) contrast(1.1)" },
];

/** Filters in one family, in catalogue order. */
export function filtersByCategory(category: FilterCategory): PhotoFilter[] {
  return PHOTO_FILTERS.filter((filter) => filter.category === category);
}

export const DEFAULT_FILTER = PHOTO_FILTERS[0];

export function getFilter(id: string): PhotoFilter {
  return PHOTO_FILTERS.find((filter) => filter.id === id) ?? DEFAULT_FILTER;
}

/**
 * Effect families.
 *
 * Weather particles get their own group because they behave unlike the rest:
 * light and texture effects are one wash over the whole frame, while particles
 * are countable specks whose look is governed by how many there are and which
 * way they fall.
 */
export type EffectCategory = "partikel" | "cahaya" | "tekstur";

export const EFFECT_CATEGORIES: { id: EffectCategory; label: string }[] = [
  { id: "partikel", label: "Cuaca" },
  { id: "cahaya", label: "Cahaya" },
  { id: "tekstur", label: "Tekstur" },
];

export interface VisualEffect {
  id: string;
  label: string;
  category: EffectCategory;
  /** What it reads as, one line — the panel shows it under the name. */
  hint: string;
  /** CSS `background` for the overlay layer painted above the photo. */
  overlay: string;
  /** How that layer blends with the photo. */
  blend: "screen" | "overlay" | "soft-light" | "multiply" | "lighten";
  /** 0–1 starting strength; the strength control is a later task. */
  opacity: number;
  /**
   * Present on weather effects: the description the CSS preview was generated
   * from, which the canvas re-uses to draw and animate the real particle field.
   */
  particle?: ParticleSpec;
}

/**
 * The knobs a weather particle actually has.
 *
 * Rather than hand-writing a background string per weather look, particles are
 * described — grain size, how densely they sit, which way they lean — and the
 * CSS is generated from that. Adding "heavier snow" then means changing a
 * number, and a later strength control has real parameters to turn.
 */
export interface ParticleSpec {
  /** Radius of one speck, in px. */
  size: number;
  /** Distance between specks, in px — smaller is denser. */
  spacing: number;
  /** Speck colour, including its own alpha. */
  color: string;
  /** Degrees the fall leans from vertical; 0 draws dots, not streaks. */
  tilt: number;
  /** Streak length in px; 0 keeps the speck round (snow, confetti). */
  streak: number;
  /** How fast the field falls on the canvas, in design px per second. */
  speed: number;
}

/**
 * Turns a particle description into a CSS background.
 *
 * Round specks become a repeating radial-gradient tile; leaning ones become a
 * repeating-linear-gradient, which is what rain reads as. A second, offset,
 * fainter layer breaks up the grid so the field looks scattered rather than
 * printed on graph paper.
 */
export function particleOverlay(spec: ParticleSpec): string {
  if (spec.streak > 0) {
    return `repeating-linear-gradient(${90 + spec.tilt}deg, ${spec.color} 0 ${spec.size}px, transparent ${spec.size}px ${spec.spacing}px)`;
  }

  const tile = spec.spacing;
  const dot = `radial-gradient(circle, ${spec.color} 0 ${spec.size}px, transparent ${spec.size + 0.6}px)`;
  return `${dot} 0 0 / ${tile}px ${tile}px, ${dot} ${tile / 2}px ${tile / 3}px / ${tile * 1.6}px ${tile * 1.6}px`;
}

/**
 * Overlays, as CSS. Grain and confetti are repeating radial dots at different
 * scales; leaks and glow are large soft gradients — enough to read correctly in
 * a preview and to hand the renderer a real description rather than a name.
 */
/**
 * Particle descriptions, shared by the CSS preview and the canvas renderer, so
 * a swatch and the animated field are the same field at different sizes.
 */
const PARTICLE_SPECS = {
  "gerimis": { size: 0.8, spacing: 14, color: "rgba(255,255,255,0.3)", tilt: 12, streak: 1, speed: 520 },
  "rain": { size: 1, spacing: 9, color: "rgba(255,255,255,0.35)", tilt: 15, streak: 1, speed: 760 },
  "badai": { size: 1.4, spacing: 6, color: "rgba(255,255,255,0.45)", tilt: 22, streak: 1, speed: 1050 },
  "snow": { size: 1.4, spacing: 14, color: "rgba(255,255,255,0.9)", tilt: 0, streak: 0, speed: 90 },
  "salju-lebat": { size: 2.2, spacing: 9, color: "rgba(255,255,255,0.95)", tilt: 0, streak: 0, speed: 130 },
  "kelopak": { size: 2, spacing: 18, color: "rgba(251,113,133,0.8)", tilt: 0, streak: 0, speed: 70 },
} satisfies Record<string, ParticleSpec>;

export const VISUAL_EFFECTS: VisualEffect[] = [
  // Cuaca — generated from a particle description, densest last.
  {
    id: "gerimis",
    label: "Gerimis",
    category: "partikel",
    hint: "Hujan halus dan renggang",
    overlay: particleOverlay(PARTICLE_SPECS["gerimis"]),
    particle: PARTICLE_SPECS["gerimis"],
    blend: "screen",
    opacity: 0.4,
  },
  {
    id: "rain",
    label: "Hujan",
    category: "partikel",
    hint: "Guratan hujan tipis",
    overlay: particleOverlay(PARTICLE_SPECS["rain"]),
    particle: PARTICLE_SPECS["rain"],
    blend: "screen",
    opacity: 0.45,
  },
  {
    id: "badai",
    label: "Hujan deras",
    category: "partikel",
    hint: "Rapat dan miring tajam",
    overlay: particleOverlay(PARTICLE_SPECS["badai"]),
    particle: PARTICLE_SPECS["badai"],
    blend: "screen",
    opacity: 0.55,
  },
  {
    id: "snow",
    label: "Salju",
    category: "partikel",
    hint: "Butiran salju berjatuhan",
    overlay: particleOverlay(PARTICLE_SPECS["snow"]),
    particle: PARTICLE_SPECS["snow"],
    blend: "screen",
    opacity: 0.7,
  },
  {
    id: "salju-lebat",
    label: "Salju lebat",
    category: "partikel",
    hint: "Butiran besar dan rapat",
    overlay: particleOverlay(PARTICLE_SPECS["salju-lebat"]),
    particle: PARTICLE_SPECS["salju-lebat"],
    blend: "screen",
    opacity: 0.8,
  },
  {
    id: "kelopak",
    label: "Kelopak",
    category: "partikel",
    hint: "Guguran kelopak merah muda",
    overlay: particleOverlay(PARTICLE_SPECS["kelopak"]),
    particle: PARTICLE_SPECS["kelopak"],
    blend: "lighten",
    opacity: 0.75,
  },
  {
    id: "confetti",
    label: "Confetti",
    category: "partikel",
    hint: "Serpihan warna perayaan",
    overlay:
      "radial-gradient(circle at 15% 20%, #f43f5e 0 3px, transparent 4px), radial-gradient(circle at 60% 15%, #facc15 0 3px, transparent 4px), radial-gradient(circle at 35% 60%, #38bdf8 0 3px, transparent 4px), radial-gradient(circle at 80% 45%, #a855f7 0 3px, transparent 4px), radial-gradient(circle at 25% 85%, #34d399 0 3px, transparent 4px)",
    blend: "lighten",
    opacity: 0.9,
  },

  // Cahaya
  {
    id: "bokeh",
    label: "Bokeh",
    category: "cahaya",
    hint: "Bulatan cahaya lembut",
    overlay:
      "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.5) 0 6px, transparent 7px), radial-gradient(circle at 70% 20%, rgba(255,255,255,0.35) 0 10px, transparent 11px), radial-gradient(circle at 45% 75%, rgba(255,255,255,0.4) 0 8px, transparent 9px), radial-gradient(circle at 85% 65%, rgba(255,255,255,0.3) 0 12px, transparent 13px)",
    blend: "screen",
    opacity: 0.7,
  },
  {
    id: "light-leak",
    label: "Light leak",
    category: "cahaya",
    hint: "Bocoran cahaya di tepi",
    overlay:
      "linear-gradient(115deg, rgba(255,138,76,0.75) 0%, rgba(255,196,120,0.35) 25%, transparent 55%)",
    blend: "screen",
    opacity: 0.65,
  },
  {
    id: "glow",
    label: "Glow",
    category: "cahaya",
    hint: "Cahaya hangat menyebar",
    overlay:
      "radial-gradient(circle at 50% 40%, rgba(255,240,200,0.65) 0%, transparent 65%)",
    blend: "soft-light",
    opacity: 0.75,
  },

  // Tekstur
  {
    id: "grain",
    label: "Film grain",
    category: "tekstur",
    hint: "Butiran ala film analog",
    overlay:
      "radial-gradient(circle, rgba(255,255,255,0.22) 0 0.5px, transparent 0.6px) 0 0 / 3px 3px",
    blend: "overlay",
    opacity: 0.5,
  },
  {
    id: "kabut",
    label: "Kabut",
    category: "tekstur",
    hint: "Selubung putih merata",
    overlay:
      "linear-gradient(0deg, rgba(255,255,255,0.35), rgba(255,255,255,0.35))",
    blend: "screen",
    opacity: 0.7,
  },
  {
    id: "smoke",
    label: "Asap",
    category: "tekstur",
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

/** Effects in one family, in catalogue order. */
export function effectsByCategory(category: EffectCategory): VisualEffect[] {
  return VISUAL_EFFECTS.filter((effect) => effect.category === category);
}
