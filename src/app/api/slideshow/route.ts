import { withFeature } from "@/lib/api/features";
import { jsonError } from "@/lib/api/http";
import { activeEventId, getBranding } from "@/lib/db/event-branding";
import { listEventPhotos } from "@/lib/db/photos";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

/** Enough to fill a wall for a while; more than a screen can show before the
 *  next poll brings fresher ones anyway. */
const DEFAULT_LIMIT = 60;
const MAX_LIMIT = 200;

/**
 * What the wall shows.
 *
 * The photos taken at whatever event the booth is running, newest first, plus
 * the event's name for the badge over them. One request rather than two, because
 * a wall that fetched its title separately could spend a moment announcing last
 * night's event over tonight's photos.
 *
 * `since` returns only what is newer, which is how the wall stays live without
 * re-downloading the evening every few seconds. It takes the timestamp of the
 * newest photo the wall already has, so a booth that fills up fast never skips a
 * guest the way "page 1 again" would.
 *
 * A booth running no event answers with an empty list and says so, rather than
 * falling back to every photo on the machine — a wall is a public screen, and
 * the failure mode of guessing there is somebody else's wedding on it.
 */
export const GET = withFeature("booth.slideshow", async (_context, request: Request) => {
  const params = new URL(request.url).searchParams;

  const asked = Number(params.get("limit") ?? DEFAULT_LIMIT);
  const limit = Number.isInteger(asked)
    ? Math.min(Math.max(asked, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  const since = params.get("since") ?? undefined;
  if (since !== undefined && Number.isNaN(Date.parse(since))) {
    return jsonError(400, "`since` harus tanggal ISO.");
  }

  try {
    const [eventId, branding] = await Promise.all([
      activeEventId(),
      getBranding(),
    ]);

    if (!eventId) {
      return Response.json(
        { eventName: branding.eventName, live: false, photos: [] },
        { headers: { "cache-control": "private, no-store" } },
      );
    }

    return Response.json(
      {
        eventName: branding.eventName,
        live: true,
        photos: await listEventPhotos(eventId, limit, since),
      },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("GET /api/slideshow failed", error);
    return jsonError(500, "Foto slideshow gagal dimuat.");
  }
});
