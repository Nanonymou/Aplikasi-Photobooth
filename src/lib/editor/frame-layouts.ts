import { createId } from "@/lib/editor/id";
import type { CanvasPage, PhotoSlotObject, SlotPhoto, SlotShape } from "@/types/editor";

export interface FrameLayoutOptions {
  rows: number;
  cols: number;
  shape: SlotShape;
  /** Space between slots, in page px. */
  gap: number;
  /** Space between the grid and the page edge, in page px. */
  margin: number;
  cornerRadius: number;
  borderWidth: number;
  borderColor: string;
  fill: string;
}

export interface FramePreset {
  id: string;
  label: string;
  rows: number;
  cols: number;
  shape: SlotShape;
  gap: number;
  margin: number;
}

/** Starting points for the frame builder; every value stays editable after. */
export const FRAME_PRESETS: FramePreset[] = [
  { id: "single", label: "Tunggal", rows: 1, cols: 1, shape: "rect", gap: 0, margin: 80 },
  { id: "strip-3", label: "Strip 3", rows: 3, cols: 1, shape: "rect", gap: 40, margin: 100 },
  { id: "strip-4", label: "Strip 4", rows: 4, cols: 1, shape: "rect", gap: 24, margin: 60 },
  { id: "grid-2x2", label: "Grid 2×2", rows: 2, cols: 2, shape: "rect", gap: 32, margin: 80 },
  { id: "grid-3x2", label: "Grid 3×2", rows: 3, cols: 2, shape: "rect", gap: 24, margin: 60 },
  { id: "polaroid-2", label: "Polaroid 2", rows: 2, cols: 1, shape: "polaroid", gap: 48, margin: 100 },
  { id: "circle-3", label: "Bulat 3", rows: 3, cols: 1, shape: "circle", gap: 40, margin: 120 },
  { id: "heart-1", label: "Hati", rows: 1, cols: 1, shape: "heart", gap: 0, margin: 100 },
];

export const DEFAULT_FRAME_OPTIONS: FrameLayoutOptions = {
  rows: 3,
  cols: 1,
  shape: "rect",
  gap: 40,
  margin: 100,
  cornerRadius: 24,
  borderWidth: 8,
  borderColor: "#ffffff",
  fill: "#e2e8f0",
};

/** Minimum slot edge, so extreme gap/margin values cannot produce empty slots. */
const MIN_SLOT_SIZE = 24;

/**
 * Lays `rows × cols` photo slots out across the page.
 *
 * `existingPhotos` are re-attached in order, so changing the layout does not
 * throw away photos the user already took.
 */
export function buildSlotGrid(
  page: Pick<CanvasPage, "width" | "height">,
  options: FrameLayoutOptions,
  existingPhotos: (SlotPhoto | null)[] = [],
): PhotoSlotObject[] {
  const rows = Math.max(1, Math.round(options.rows));
  const cols = Math.max(1, Math.round(options.cols));

  const availableWidth = page.width - options.margin * 2 - options.gap * (cols - 1);
  const availableHeight = page.height - options.margin * 2 - options.gap * (rows - 1);

  const cellWidth = Math.max(MIN_SLOT_SIZE, availableWidth / cols);
  const cellHeight = Math.max(MIN_SLOT_SIZE, availableHeight / rows);

  const slots: PhotoSlotObject[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const index = row * cols + col;

      slots.push({
        id: createId("slot"),
        kind: "slot",
        name: `Slot foto ${index + 1}`,
        x: options.margin + col * (cellWidth + options.gap),
        y: options.margin + row * (cellHeight + options.gap),
        width: cellWidth,
        height: cellHeight,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        shape: options.shape,
        cornerRadius: options.cornerRadius,
        borderWidth: options.borderWidth,
        borderColor: options.borderColor,
        fill: options.fill,
        photo: existingPhotos[index] ?? null,
      });
    }
  }

  return slots;
}

/** A single slot centred on the page, for the "add one slot" action. */
export function buildSingleSlot(
  page: Pick<CanvasPage, "width" | "height">,
  options: FrameLayoutOptions,
  index: number,
): PhotoSlotObject {
  const width = Math.max(MIN_SLOT_SIZE, page.width * 0.4);
  const height = Math.max(MIN_SLOT_SIZE, page.height * 0.25);

  // Nudge each new slot down-right so they do not stack invisibly.
  const offset = (index % 5) * 40;

  return {
    id: createId("slot"),
    kind: "slot",
    name: `Slot foto ${index + 1}`,
    x: (page.width - width) / 2 + offset,
    y: (page.height - height) / 2 + offset,
    width,
    height,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    shape: options.shape,
    cornerRadius: options.cornerRadius,
    borderWidth: options.borderWidth,
    borderColor: options.borderColor,
    fill: options.fill,
    photo: null,
  };
}
