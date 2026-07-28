import { enhanceFace, hasAlpha } from "@/lib/ai/enhance";
import { PhotoNotFoundError, readRaster, writeRaster } from "@/lib/ai/raster";
import { readAiRequest, readNumber } from "@/lib/api/ai-request";
import { jsonError } from "@/lib/api/http";
import { requireOwnerId } from "@/lib/api/owner";

export const runtime = "nodejs";

/** Matches the slider in the AI panel: 0 leaves the photo alone, 1 is strongest. */
const DEFAULT_INTENSITY = 0.6;

/**
 * Automatic face enhancement.
 *
 *   { key, intensity? } → { key, url, width, height, bytes, before, after }
 *
 * `before`/`after` are mean brightness, which is what makes the result
 * checkable rather than a matter of opinion — and what the panel's before/after
 * toggle is showing off.
 *
 * The result keeps its alpha channel if the source had one, so enhancing a
 * cut-out does not quietly fill its background back in.
 */
export async function POST(request: Request): Promise<Response> {
  const parsed = await readAiRequest(request);
  if (!parsed.ok) return parsed.response;

  const intensity = readNumber(parsed.body, "intensity", {
    min: 0,
    max: 1,
    fallback: DEFAULT_INTENSITY,
  });
  if (!intensity.ok) return intensity.response;

  try {
    await requireOwnerId();

    const raster = await readRaster(parsed.key);
    const transparent = hasAlpha(raster);
    const stats = enhanceFace(raster, intensity.value);
    const result = await writeRaster(raster, { transparent });

    return Response.json(
      {
        ...result,
        source: parsed.key,
        intensity: intensity.value,
        ...stats,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof PhotoNotFoundError) {
      return jsonError(404, error.message);
    }
    console.error("POST /api/ai/face-enhance failed", error);
    return jsonError(500, "Perbaikan wajah gagal.");
  }
}
