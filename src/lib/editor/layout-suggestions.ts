import type { Box } from "@/lib/editor/snapping";
import type { CanvasPage } from "@/types/editor";

export interface LayoutSuggestion {
  id: string;
  label: string;
  /** One box per slot, in the page's existing slot order. */
  boxes: Box[];
}

const MARGIN = 0.07;
const GAP = 0.03;

/** Even grid of `rows × cols` cells across the page. */
function gridBoxes(
  page: Pick<CanvasPage, "width" | "height">,
  rows: number,
  cols: number,
  count: number,
): Box[] {
  const margin = Math.round(Math.min(page.width, page.height) * MARGIN);
  const gap = Math.round(Math.min(page.width, page.height) * GAP);

  const cellWidth = (page.width - margin * 2 - gap * (cols - 1)) / cols;
  const cellHeight = (page.height - margin * 2 - gap * (rows - 1)) / rows;

  const boxes: Box[] = [];
  for (let index = 0; index < count; index += 1) {
    const row = Math.floor(index / cols);
    const col = index % cols;
    boxes.push({
      x: margin + col * (cellWidth + gap),
      y: margin + row * (cellHeight + gap),
      width: cellWidth,
      height: cellHeight,
    });
  }
  return boxes;
}

/** One large slot on top, the rest sharing a row beneath it. */
function featuredBoxes(
  page: Pick<CanvasPage, "width" | "height">,
  count: number,
): Box[] {
  const margin = Math.round(Math.min(page.width, page.height) * MARGIN);
  const gap = Math.round(Math.min(page.width, page.height) * GAP);

  const innerWidth = page.width - margin * 2;
  const innerHeight = page.height - margin * 2;
  const heroHeight = innerHeight * 0.62;
  const restHeight = innerHeight - heroHeight - gap;
  const rest = count - 1;
  const restWidth = (innerWidth - gap * (rest - 1)) / rest;

  const boxes: Box[] = [
    { x: margin, y: margin, width: innerWidth, height: heroHeight },
  ];

  for (let index = 0; index < rest; index += 1) {
    boxes.push({
      x: margin + index * (restWidth + gap),
      y: margin + heroHeight + gap,
      width: restWidth,
      height: restHeight,
    });
  }

  return boxes;
}

/**
 * Layout options for the page's current slot count.
 *
 * Deliberately rule-based rather than learned: for a handful of rectangles on a
 * fixed page there is a small set of arrangements worth offering, and the user
 * judges them from the thumbnails anyway.
 */
export function suggestLayouts(page: CanvasPage): LayoutSuggestion[] {
  const count = page.objects.filter((object) => object.kind === "slot").length;
  if (count === 0) return [];

  const suggestions: LayoutSuggestion[] = [];
  const portrait = page.height >= page.width;

  // Every exact rows × cols factorisation, so nothing is left half-empty.
  for (let cols = 1; cols <= count; cols += 1) {
    if (count % cols !== 0) continue;
    const rows = count / cols;

    // A single row and a single column are different arrangements, so they need
    // labels that tell them apart rather than both reading "Strip N".
    const label =
      cols === 1
        ? `Strip vertikal ${count}`
        : rows === 1
          ? `Strip horizontal ${count}`
          : `Grid ${rows}×${cols}`;

    suggestions.push({
      id: `grid-${rows}x${cols}`,
      label,
      boxes: gridBoxes(page, rows, cols, count),
    });
  }

  if (count >= 3) {
    suggestions.push({
      id: "featured",
      label: "Satu sorotan",
      boxes: featuredBoxes(page, count),
    });
  }

  // Prefer arrangements whose cells are closest to the page's own proportions —
  // those read as balanced rather than as thin slivers.
  return suggestions
    .map((suggestion) => {
      const first = suggestion.boxes[0];
      const cellRatio = first.width / first.height;
      const target = portrait ? 1.3 : 0.9;
      return { suggestion, score: Math.abs(cellRatio - target) };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 4)
    .map((entry) => entry.suggestion);
}
