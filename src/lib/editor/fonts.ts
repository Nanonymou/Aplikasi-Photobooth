/**
 * Konva measures text against the 2D canvas, which cannot resolve CSS custom
 * properties. Objects store families like `var(--font-geist-sans)` so the DOM and
 * the canvas stay in sync; this resolves them to a concrete family list at paint
 * time.
 */
export function resolveFontFamily(fontFamily: string): string {
  const match = /^var\((--[\w-]+)\)$/.exec(fontFamily.trim());
  if (!match) return fontFamily;

  if (typeof window === "undefined") return "sans-serif";

  const resolved = getComputedStyle(document.documentElement)
    .getPropertyValue(match[1])
    .trim();

  return resolved || "sans-serif";
}
