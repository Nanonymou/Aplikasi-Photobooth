import "server-only";

import { query } from "@/lib/db/client";

/**
 * Layout recommendations for a page with a given number of photo slots.
 *
 * Two sources, deliberately:
 *
 *   grid      arrangements derived from the numbers — every exact rows × cols
 *             factorisation of the slot count, plus one "featured" variant.
 *             Always available, never surprising.
 *   template  slot rectangles lifted from published templates that hold the
 *             same number of photos, rescaled onto this page.
 *
 * The second is what makes this worth a round trip rather than a local
 * function: the client cannot know what a designer already made work, and a
 * composition that survived curation is a better suggestion than anything a
 * rule produces. The rules stay as the floor, for slot counts no template
 * covers.
 */

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutSuggestion {
  id: string;
  label: string;
  source: "grid" | "template";
  /** Present when the arrangement came from a template. */
  templateSlug?: string;
  boxes: Box[];
}

/** A suggestion plus what it needs to be ranked, kept off the wire. */
interface Ranked {
  suggestion: LayoutSuggestion;
  /** Proportions of the canvas a template was drawn for; grids have none. */
  canvasRatio?: number;
}

export interface PageShape {
  width: number;
  height: number;
  slotCount: number;
}

const MARGIN = 0.07;
const GAP = 0.03;

function round(box: Box): Box {
  return {
    x: Math.round(box.x),
    y: Math.round(box.y),
    width: Math.round(box.width),
    height: Math.round(box.height),
  };
}

/** Even grid of `rows × cols` cells across the page. */
function gridBoxes(page: PageShape, rows: number, cols: number): Box[] {
  const margin = Math.round(Math.min(page.width, page.height) * MARGIN);
  const gap = Math.round(Math.min(page.width, page.height) * GAP);

  const cellWidth = (page.width - margin * 2 - gap * (cols - 1)) / cols;
  const cellHeight = (page.height - margin * 2 - gap * (rows - 1)) / rows;

  return Array.from({ length: page.slotCount }, (_, index) =>
    round({
      x: margin + (index % cols) * (cellWidth + gap),
      y: margin + Math.floor(index / cols) * (cellHeight + gap),
      width: cellWidth,
      height: cellHeight,
    }),
  );
}

/** One large slot on top, the rest sharing a row beneath it. */
function featuredBoxes(page: PageShape): Box[] {
  const margin = Math.round(Math.min(page.width, page.height) * MARGIN);
  const gap = Math.round(Math.min(page.width, page.height) * GAP);

  const innerWidth = page.width - margin * 2;
  const innerHeight = page.height - margin * 2;
  const heroHeight = innerHeight * 0.62;
  const restHeight = innerHeight - heroHeight - gap;
  const rest = page.slotCount - 1;
  const restWidth = (innerWidth - gap * (rest - 1)) / rest;

  const boxes = [
    round({ x: margin, y: margin, width: innerWidth, height: heroHeight }),
  ];

  for (let index = 0; index < rest; index += 1) {
    boxes.push(
      round({
        x: margin + index * (restWidth + gap),
        y: margin + heroHeight + gap,
        width: restWidth,
        height: restHeight,
      }),
    );
  }

  return boxes;
}

function ruleSuggestions(page: PageShape): Ranked[] {
  const suggestions: Ranked[] = [];

  for (let cols = 1; cols <= page.slotCount; cols += 1) {
    if (page.slotCount % cols !== 0) continue;
    const rows = page.slotCount / cols;

    // A single row and a single column are different arrangements, so they need
    // labels that tell them apart rather than both reading "Strip N".
    const label =
      cols === 1
        ? `Strip vertikal ${page.slotCount}`
        : rows === 1
          ? `Strip horizontal ${page.slotCount}`
          : `Grid ${rows}×${cols}`;

    suggestions.push({
      suggestion: {
        id: `grid-${rows}x${cols}`,
        label,
        source: "grid",
        boxes: gridBoxes(page, rows, cols),
      },
    });
  }

  if (page.slotCount >= 3) {
    suggestions.push({
      suggestion: {
        id: "featured",
        label: "Satu sorotan",
        source: "grid",
        boxes: featuredBoxes(page),
      },
    });
  }

  return suggestions;
}

interface TemplateLayoutRow {
  slug: string;
  label: string;
  width: number;
  height: number;
  slots: { x: number; y: number; width: number; height: number }[];
}

/**
 * Rescales a template's slots onto this page.
 *
 * The composition keeps its proportions and is centred, rather than stretched:
 * a heart-shaped arrangement squeezed into a different aspect ratio stops being
 * the thing that was picked.
 */
function rescale(row: TemplateLayoutRow, page: PageShape): Box[] {
  const scale = Math.min(page.width / row.width, page.height / row.height);
  const offsetX = (page.width - row.width * scale) / 2;
  const offsetY = (page.height - row.height * scale) / 2;

  return row.slots.map((slot) =>
    round({
      x: offsetX + slot.x * scale,
      y: offsetY + slot.y * scale,
      width: slot.width * scale,
      height: slot.height * scale,
    }),
  );
}

async function templateSuggestions(page: PageShape): Promise<Ranked[]> {
  const rows = await query<TemplateLayoutRow>(
    `select slug, label, width, height, slots
       from design_templates
      where published_at is not null
        and jsonb_array_length(slots) = $1
      -- Closest canvas proportions first: a layout drawn for a photostrip
      -- transfers badly to a landscape card, however good it is.
      order by abs((width::float / height) - ($2::float / $3)), position
      limit 4`,
    [page.slotCount, page.width, page.height],
  );

  return rows.map((row) => ({
    suggestion: {
      id: `template-${row.slug}`,
      label: row.label,
      source: "template" as const,
      templateSlug: row.slug,
      boxes: rescale(row, page),
    },
    canvasRatio: row.width / row.height,
  }));
}

/**
 * Ranks the arrangements and returns the best few.
 *
 * The two sources are judged differently, because they are different kinds of
 * thing. A grid is judged by its cells: those closest to the page's own
 * proportions read as balanced rather than as thin slivers. A template is
 * judged by the canvas it was drawn for — its cells were already chosen by a
 * person, and second-guessing them by cell shape pushes a photostrip layout
 * below a rule-made grid on a photostrip page. Curated compositions also carry
 * a small head start.
 */
export async function suggestLayouts(
  page: PageShape,
  limit = 6,
): Promise<LayoutSuggestion[]> {
  if (page.slotCount < 1) return [];

  const pageRatio = page.width / page.height;
  const cellTarget = page.height >= page.width ? 1.3 : 0.9;

  const ranked = [
    ...(await templateSuggestions(page)),
    ...ruleSuggestions(page),
  ];

  return ranked
    .map((entry) => {
      if (entry.canvasRatio !== undefined) {
        return { entry, score: Math.abs(entry.canvasRatio - pageRatio) - 0.1 };
      }

      const first = entry.suggestion.boxes[0];
      const ratio = first.height === 0 ? 0 : first.width / first.height;
      return { entry, score: Math.abs(ratio - cellTarget) };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map(({ entry }) => entry.suggestion);
}
