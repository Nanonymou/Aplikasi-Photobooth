import { withFeature } from "@/lib/api/features";
import { isJsonObject, jsonError, readJsonBody } from "@/lib/api/http";
import {
  getSlideshowControl,
  setSlideshowControl,
  SLIDESHOW_PACES,
  type SlideshowPace,
} from "@/lib/db/event-branding";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

const FIELDS = ["playing", "paceSeconds"];

/**
 * The wall's remote.
 *
 * Play, pause, and how long each photo holds — held on the server rather than in
 * the browser showing the slideshow, because the wall is a projector in the
 * corner and the operator is across the room with a phone. A control that only
 * exists on the screen can only be reached by walking to it.
 *
 * The wall reads this state on the poll it already makes for new photos, so
 * there is nothing extra to fetch and the two cannot drift apart for longer than
 * one interval.
 */
export const GET = withFeature("booth.slideshow", async () => {
  try {
    return Response.json(await getSlideshowControl(), {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    console.error("GET /api/slideshow/control failed", error);
    return jsonError(500, "Kontrol slideshow gagal dimuat.");
  }
});

/**
 * Changes one or both.
 *
 * Omitting a field leaves it alone: "pause" pressed on a phone must not quietly
 * reset a pace somebody chose an hour ago, and the two controls are pressed by
 * different people at different moments.
 */
export const PUT = withFeature(
  "booth.slideshow",
  async (_context, request: Request) => {
    const body = await readJsonBody(request);
    if (!body.ok) return body.response;
    if (!isJsonObject(body.value)) return jsonError(400, "Body bukan objek.");

    const extra = Object.keys(body.value).filter((key) => !FIELDS.includes(key));
    if (extra.length > 0) {
      return jsonError(400, `Bidang tidak dikenal: ${extra.join(", ")}.`);
    }

    const update: { playing?: boolean; paceSeconds?: SlideshowPace } = {};

    if ("playing" in body.value) {
      if (typeof body.value.playing !== "boolean") {
        return jsonError(400, "`playing` harus true atau false.");
      }
      update.playing = body.value.playing;
    }

    if ("paceSeconds" in body.value) {
      const pace = body.value.paceSeconds;
      if (!SLIDESHOW_PACES.includes(pace as SlideshowPace)) {
        return jsonError(
          400,
          `\`paceSeconds\` harus salah satu dari: ${SLIDESHOW_PACES.join(", ")}.`,
        );
      }
      update.paceSeconds = pace as SlideshowPace;
    }

    if (Object.keys(update).length === 0) {
      return jsonError(400, "Tidak ada yang diubah.");
    }

    try {
      return Response.json(await setSlideshowControl(update), {
        headers: { "cache-control": "private, no-store" },
      });
    } catch (error) {
      console.error("PUT /api/slideshow/control failed", error);
      return jsonError(500, "Kontrol slideshow gagal disimpan.");
    }
  },
);
