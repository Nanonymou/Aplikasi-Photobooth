import { autoColorCorrect } from "@/lib/ai/color-correct";
import { hasAlpha } from "@/lib/ai/enhance";
import { PhotoNotFoundError, readRaster, writeRaster } from "@/lib/ai/raster";
import { readAiRequest } from "@/lib/api/ai-request";
import { jsonError } from "@/lib/api/http";
import { requireOwnerId } from "@/lib/api/owner";

export const runtime = "nodejs";

/**
 * Smart colour correction.
 *
 *   { key } → { key, url, width, height, bytes, ranges, sampled }
 *
 * No knobs: auto levels decides its own mapping from the image, and a strength
 * slider on top of it would only be a second opinion about a measurement. The
 * per-channel range it chose comes back so the client can say what happened —
 * a red low of 30 against a blue low of 2 *is* the colour cast it removed.
 */
export async function POST(request: Request): Promise<Response> {
  const parsed = await readAiRequest(request);
  if (!parsed.ok) return parsed.response;

  try {
    await requireOwnerId();

    const raster = await readRaster(parsed.key);
    const transparent = hasAlpha(raster);
    const stats = autoColorCorrect(raster);

    if (!stats) {
      return jsonError(422, "Foto tidak punya piksel untuk dikoreksi.");
    }

    const result = await writeRaster(raster, { transparent });

    return Response.json(
      { ...result, source: parsed.key, ...stats },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof PhotoNotFoundError) {
      return jsonError(404, error.message);
    }
    console.error("POST /api/ai/color-correct failed", error);
    return jsonError(500, "Koreksi warna gagal.");
  }
}
