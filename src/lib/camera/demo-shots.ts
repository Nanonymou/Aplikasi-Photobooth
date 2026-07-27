/**
 * Stand-in frames for demo mode.
 *
 * The camera page has to be usable on machines with no webcam — CI, a desktop
 * without a camera, or a denied permission prompt — so captures fall back to
 * these sample assets and the rest of the flow behaves identically.
 */
export const DEMO_SHOT_SOURCES = [
  "/samples/photo-1.svg",
  "/samples/photo-2.svg",
  "/samples/photo-3.svg",
] as const;

export function demoShotSource(index: number): string {
  return DEMO_SHOT_SOURCES[index % DEMO_SHOT_SOURCES.length];
}
