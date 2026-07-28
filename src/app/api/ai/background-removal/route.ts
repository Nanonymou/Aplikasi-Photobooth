import { readAiRequest, readNumber } from "@/lib/api/ai-request";
import { jsonError } from "@/lib/api/http";
import { requireOwnerId } from "@/lib/api/owner";
import {
  DEFAULT_TOLERANCE,
  MAX_TOLERANCE,
  MIN_TOLERANCE,
  removeBackground,
} from "@/lib/ai/background-removal";
import { PhotoNotFoundError, readRaster, writeRaster } from "@/lib/ai/raster";

export const runtime = "nodejs";

/**
 * Removes a photo's background.
 *
 *   { key, tolerance? } → { key, url, width, height, bytes, cleared }
 *
 * The result is a new stored object, so the original is untouched and reverting
 * is just pointing back at the key the client already has.
 *
 * Synchronous: this takes well under a second for a photobooth-sized frame. A
 * hosted segmentation model would want a job id and polling instead, which is
 * why the editor already drives this through a progress-reporting job — only
 * the inside of this handler would change.
 */
export async function POST(request: Request): Promise<Response> {
  const parsed = await readAiRequest(request);
  if (!parsed.ok) return parsed.response;

  const tolerance = readNumber(parsed.body, "tolerance", {
    min: MIN_TOLERANCE,
    max: MAX_TOLERANCE,
    fallback: DEFAULT_TOLERANCE,
  });
  if (!tolerance.ok) return tolerance.response;

  try {
    await requireOwnerId();

    const raster = await readRaster(parsed.key);
    const stats = removeBackground(raster, tolerance.value);
    const result = await writeRaster(raster, { transparent: true });

    return Response.json(
      {
        ...result,
        source: parsed.key,
        tolerance: tolerance.value,
        // What the tool believed the background was, and how much of the frame
        // it cleared — enough for the UI to warn when a cut-out went wrong.
        background: stats.background,
        cleared: Number(stats.cleared.toFixed(4)),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof PhotoNotFoundError) {
      return jsonError(404, error.message);
    }
    console.error("POST /api/ai/background-removal failed", error);
    return jsonError(500, "Penghapusan latar gagal.");
  }
}
