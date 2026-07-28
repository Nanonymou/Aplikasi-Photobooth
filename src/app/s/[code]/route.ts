import { findShare, recordShareDownload } from "@/lib/db/shares";
import { getPhotoStorage } from "@/lib/storage/photo-storage";

export const runtime = "nodejs";

function plain(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

/**
 * The share link itself.
 *
 * Deliberately short and outside `/api`: this is the URL inside a QR code, and
 * it gets typed by hand, read aloud, and printed on a card.
 *
 * It serves the file rather than redirecting to the storage URL, because the
 * share's own rules — expiry, revocation, the download count — only hold if
 * every read passes through here.
 */
export async function GET(
  _request: Request,
  context: RouteContext<"/s/[code]">,
): Promise<Response> {
  const { code } = await context.params;

  const lookup = await findShare(code);
  if (lookup.status === "missing") {
    return plain(404, "Tautan tidak ditemukan.");
  }
  if (lookup.status === "expired") {
    return plain(410, "Tautan sudah kedaluwarsa.");
  }
  if (lookup.status === "revoked") {
    return plain(410, "Tautan sudah dinonaktifkan pemiliknya.");
  }

  const { share } = lookup;
  const data = await getPhotoStorage().read(share.storageKey);
  if (!data) return plain(404, "Berkas tidak ditemukan lagi.");

  await recordShareDownload(share.code);

  return new Response(data as BodyInit, {
    headers: {
      "content-type": share.contentType,
      "content-length": String(data.byteLength),
      // `inline` so a phone shows the picture first — saving it is one tap
      // away, while a forced download is a file the guest has to go find.
      "content-disposition": `inline; filename="${share.filename}"`,
      // Private: the link is the capability, and a shared cache holding the
      // picture would outlive the expiry that makes the link safe to hand out.
      "cache-control": "private, max-age=300",
    },
  });
}
