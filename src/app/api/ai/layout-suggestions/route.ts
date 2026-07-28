import { suggestLayouts } from "@/lib/ai/layout";
import { jsonError, readJsonBody } from "@/lib/api/http";

export const runtime = "nodejs";

const MAX_SLOTS = 60;
const MIN_SIDE = 16;
const MAX_SIDE = 20_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Layout recommendations for a page.
 *
 *   { width, height, slotCount } → { suggestions: [{ id, label, source, boxes }] }
 *
 * Boxes are page coordinates, in the page's own design pixels and in slot
 * order, so applying one is a positional update on the slots already there —
 * the photos in them never move to a different slot.
 *
 * Suggestions come from two places: arrangements derived from the slot count,
 * and slot rectangles taken from published templates that hold the same number
 * of photos. The second is the reason this is a request rather than a local
 * function — the client cannot know what a designer already made work.
 */
export async function POST(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  if (!isRecord(body.value)) return jsonError(400, "Body bukan objek JSON.");

  const { width, height, slotCount } = body.value;

  for (const [name, value] of [
    ["width", width],
    ["height", height],
  ] as const) {
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < MIN_SIDE ||
      value > MAX_SIDE
    ) {
      return jsonError(
        400,
        `Bidang \`${name}\` harus bilangan bulat ${MIN_SIDE}–${MAX_SIDE}.`,
      );
    }
  }

  if (
    typeof slotCount !== "number" ||
    !Number.isInteger(slotCount) ||
    slotCount < 1 ||
    slotCount > MAX_SLOTS
  ) {
    return jsonError(400, `Bidang \`slotCount\` harus bilangan 1–${MAX_SLOTS}.`);
  }

  try {
    const suggestions = await suggestLayouts({
      width: width as number,
      height: height as number,
      slotCount,
    });

    return Response.json(
      { suggestions },
      // The recommendations depend only on the page's shape and the published
      // catalogue, so two guests with the same photostrip get the same answer.
      { headers: { "cache-control": "public, max-age=60" } },
    );
  } catch (error) {
    console.error("POST /api/ai/layout-suggestions failed", error);
    return jsonError(500, "Rekomendasi tata letak gagal dibuat.");
  }
}
