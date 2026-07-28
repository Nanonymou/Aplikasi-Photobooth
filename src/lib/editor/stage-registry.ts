import type Konva from "konva";

/**
 * Everything an export needs to crop the page out of the live stage.
 *
 * Export runs from the top bar, which sits outside the canvas tree, and the
 * stage is not something React state should carry around. A module-level
 * registry keeps that one imperative handle — plus the transform needed to
 * locate the page inside it — in a single, obvious place.
 */
/**
 * Konva name marking a node as editor chrome: on screen but never in a file.
 *
 * Exporting crops the live stage, so anything drawn over the page — the paper
 * shadow, the transparency checkerboard, snap guides, selection handles — would
 * otherwise be baked into the download. Nodes carrying this name are hidden for
 * the duration of the capture.
 */
export const EXPORT_CHROME = "export-chrome";

export interface StageSnapshot {
  stage: Konva.Stage;
  /** Top-left of the page within the stage, in stage px. */
  origin: { x: number; y: number };
  /** Scale the page is currently drawn at. */
  zoom: number;
}

let snapshot: StageSnapshot | null = null;

export function registerStage(next: StageSnapshot | null): void {
  snapshot = next;
}

export function getStageSnapshot(): StageSnapshot | null {
  return snapshot;
}
