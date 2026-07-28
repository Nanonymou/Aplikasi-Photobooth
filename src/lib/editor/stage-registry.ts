import type Konva from "konva";

/**
 * Everything an export needs to crop the page out of the live stage.
 *
 * Export runs from the top bar, which sits outside the canvas tree, and the
 * stage is not something React state should carry around. A module-level
 * registry keeps that one imperative handle — plus the transform needed to
 * locate the page inside it — in a single, obvious place.
 */
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
