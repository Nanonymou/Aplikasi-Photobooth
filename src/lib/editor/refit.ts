import { pageOrientation } from "@/types/editor";
import type { CanvasObject, CanvasPage, PageOrientation } from "@/types/editor";

/**
 * Turning a page, and fitting what is on it into the new shape.
 *
 * Shared rather than duplicated: the editor turns a page from the inspector and
 * the API turns one at `PATCH /api/designs/[id]/pages/[pageId]`, and two
 * implementations of "what happens to the layout" is how the same design ends up
 * looking different depending on which button somebody pressed.
 *
 * Pure, and free of both the store and the database, so it can be called from
 * either side.
 */

/**
 * Rescales objects from one page size into another.
 *
 * One uniform scale, taken from whichever axis is tighter — so nothing is
 * squashed and no photo's aspect ratio changes. Centred by the content's own
 * bounds rather than the old page's, so a layout that already sat off to one
 * side keeps its composition instead of being silently re-centred.
 */
export function refitObjects(
  objects: CanvasObject[],
  from: { width: number; height: number },
  to: { width: number; height: number },
): CanvasObject[] {
  if (objects.length === 0) return objects;

  const scale = Math.min(to.width / from.width, to.height / from.height);

  const left = Math.min(...objects.map((object) => object.x));
  const top = Math.min(...objects.map((object) => object.y));
  const right = Math.max(...objects.map((object) => object.x + object.width));
  const bottom = Math.max(...objects.map((object) => object.y + object.height));

  const offsetX = (to.width - (right - left) * scale) / 2 - left * scale;
  const offsetY = (to.height - (bottom - top) * scale) / 2 - top * scale;

  return objects.map((object) => ({
    ...object,
    x: object.x * scale + offsetX,
    y: object.y * scale + offsetY,
    width: object.width * scale,
    height: object.height * scale,
  }));
}

/**
 * The page, turned — or the same page back when there is nothing to turn.
 *
 * A square has no other orientation to be in, and a page already the right way
 * round must not be swapped: both would be a change that changes nothing, which
 * on the client costs an undo step and on the server costs a version bump.
 */
export function turnPage<T extends Pick<CanvasPage, "width" | "height" | "objects">>(
  page: T,
  orientation: PageOrientation,
): T | null {
  if (page.width === page.height) return null;
  if (pageOrientation(page) === orientation) return null;

  const size = { width: page.height, height: page.width };
  return {
    ...page,
    ...size,
    objects: refitObjects(page.objects, page, size),
  };
}
