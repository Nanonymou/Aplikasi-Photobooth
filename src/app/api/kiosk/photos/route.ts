import { withFeature } from "@/lib/api/features";
import { jsonError } from "@/lib/api/http";
import { identifyImage } from "@/lib/api/image-file";
import { activeEventId } from "@/lib/db/event-branding";
import {
  countSessionPhotos,
  recordPhoto,
  sessionBelongsTo,
  startSession,
} from "@/lib/db/photos";
import { getPhotoStorage } from "@/lib/storage/photo-storage";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

/** A booth capture is a downscaled frame, not a phone's original. */
const MAX_PHOTO_BYTES = 12 * 1024 * 1024;

/**
 * A shot from the booth.
 *
 * Different from `POST /api/photos` in the one way that matters: this writes the
 * database rows too. The general upload deliberately stores bytes and nothing
 * else — a photo has no meaning there until something references it — but a
 * booth has nobody to do the referencing. The guest walks away, and if the shot
 * is not filed at the moment it is taken it is never filed at all.
 *
 * So each upload lands in a sitting, and the sitting is tagged with the event
 * the booth is running. That is what lets the slideshow show tonight's photos
 * rather than every photo ever taken on this machine, and what lets an operator
 * hand over "the wedding" at the end of the night.
 *
 * The first shot of a sitting omits `sessionId` and gets one back; the rest send
 * it. A session id that is not this booth's is refused rather than trusted —
 * otherwise a guessed id would file a stranger's face into somebody else's
 * evening.
 *
 * Behind the same feature gate as the rest of kiosk mode, so an account without
 * it cannot use the booth as an unmetered upload endpoint.
 */
export const POST = withFeature(
  "booth.kiosk",
  async (context, request: Request) => {
    const viewer = context.viewer;
    if (!viewer) return jsonError(401, "Masuk dulu untuk melanjutkan.");

    const type = request.headers.get("content-type") ?? "";
    if (!type.includes("multipart/form-data")) {
      return jsonError(415, "Unggahan harus berupa multipart/form-data.");
    }

    const declared = Number(request.headers.get("content-length") ?? "0");
    if (declared > MAX_PHOTO_BYTES) return jsonError(413, "Berkas terlalu besar.");

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return jsonError(400, "Isi unggahan tidak terbaca.");
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      return jsonError(400, "Bidang `file` wajib diisi.");
    }
    if (file.size === 0) return jsonError(400, "Berkas kosong.");
    if (file.size > MAX_PHOTO_BYTES) return jsonError(413, "Berkas terlalu besar.");

    const data = new Uint8Array(await file.arrayBuffer());

    // The browser's reported type comes from the filename, so the bytes decide.
    const image = identifyImage(data);
    if (!image) {
      return jsonError(415, "Berkas bukan gambar JPEG, PNG, atau WEBP.");
    }

    const asked = form.get("sessionId");
    const sessionId = typeof asked === "string" && asked.length > 0 ? asked : null;

    try {
      const ownerId = viewer.profile.id;

      let session = sessionId;
      if (session) {
        if (!(await sessionBelongsTo(ownerId, session))) {
          return jsonError(404, "Sesi foto tidak ditemukan.");
        }
      } else {
        // A new sitting, tagged with whatever the booth is running right now.
        // Read at this moment rather than at the start of the evening: an
        // operator who switches events between guests expects the next guest's
        // photos to land in the next event.
        const started = await startSession(ownerId, {
          eventId: await activeEventId(),
        });
        session = started.id;
      }

      const stored = await getPhotoStorage().put(data, image.extension);
      const photo = await recordPhoto(ownerId, {
        storageKey: stored.key,
        sessionId: session,
        position: await countSessionPhotos(session),
        contentType: image.contentType,
        source: "camera",
        width: image.width,
        height: image.height,
        bytes: stored.bytes,
        // The booth mirrors its preview so guests see themselves the right way
        // round; the frame it captures is already un-mirrored.
        mirrored: false,
        capturedAt: new Date().toISOString(),
      });

      return Response.json(
        {
          sessionId: session,
          photo: {
            id: photo.id,
            url: getPhotoStorage().url(stored.key),
            width: photo.width,
            height: photo.height,
            position: photo.position,
          },
        },
        { status: 201, headers: { "cache-control": "private, no-store" } },
      );
    } catch (error) {
      console.error("POST /api/kiosk/photos failed", error);
      return jsonError(500, "Foto gagal disimpan.");
    }
  },
);
