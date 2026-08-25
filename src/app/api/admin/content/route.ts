import { withPermission } from "@/lib/api/authorize";
import { jsonError } from "@/lib/api/http";
import { identifyImage } from "@/lib/api/image-file";
import { getPhotoStorage } from "@/lib/storage/photo-storage";
import {
  countContent,
  createAsset,
  DuplicateSlugError,
  isContentType,
  listContent,
  UnknownCategoryError,
  type ContentStatus,
} from "@/lib/db/admin-content";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

/** A grid of cards, not a table of rows: a screenful is larger here. */
const DEFAULT_LIMIT = 48;
const MAX_LIMIT = 200;

function parseLimit(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

/** 0-based, as the name says. Anything unusable starts at the beginning. */
function parseOffset(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

/**
 * The content library an admin curates.
 *
 * Everything the four decoration tables hold, drafts included — the stockroom
 * behind `/api/library/*`, which only ever shows what is published. One endpoint
 * across all four kinds because the console shows them in one grid, and asking
 * it to fan out to four URLs would make "semua" the slowest tab.
 *
 * `counts` covers the whole library rather than the current filter: the summary
 * strip has to keep saying how much exists while the grid shows a search.
 *
 * Unrecognised `type` or `status` values are ignored rather than rejected. A
 * stale bookmark should show the unfiltered library, not an error — the query
 * string is a view, and there is nothing to protect by being strict about it.
 */
export const GET = withPermission(
  "admin.content.manage",
  async (viewer, request: Request) => {
    const params = new URL(request.url).searchParams;

    const type = params.get("type");
    const status = params.get("status");

    try {
      const [page, counts] = await Promise.all([
        listContent({
          search: params.get("q") ?? undefined,
          type: isContentType(type) ? type : undefined,
          status:
            status === "published" || status === "draft"
              ? (status as ContentStatus)
              : undefined,
          limit: parseLimit(params.get("limit")),
          offset: parseOffset(params.get("offset")),
        }),
        countContent(),
      ]);

      return Response.json(
        { ...page, counts, viewer: { role: viewer.profile.role } },
        { headers: { "cache-control": "private, no-store" } },
      );
    } catch (error) {
      console.error("GET /api/admin/content failed", error);
      return jsonError(500, "Pustaka konten gagal dimuat.");
    }
  },
);

/** A sticker or a backdrop, not a camera dump. */
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_LABEL = 120;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function readFlag(value: FormDataEntryValue | null): boolean {
  return value === "true" || value === "1" || value === "on";
}

/**
 * Adds an uploaded asset to the library.
 *
 *   multipart: file, type, label, categorySlug, premium?, publish?
 *
 * Stickers and backgrounds only. A template is a composition and a text style is
 * a set of font fields; neither is a file somebody uploads, and one endpoint
 * half-understanding four shapes is worse than three endpoints understanding
 * one each.
 *
 * The browser's declared content type is ignored — it comes from the filename —
 * so the bytes are sniffed instead, which is also where the artwork's real size
 * comes from. Storage is content-addressed, so uploading the same picture twice
 * costs one file and two rows.
 *
 * New assets land as drafts unless `publish` says otherwise: the editor should
 * not start offering something the moment it is uploaded, before anyone has
 * looked at how it renders.
 */
export const POST = withPermission(
  "admin.content.manage",
  async (_viewer, request: Request) => {
    if (!(request.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      return jsonError(415, "Unggahan harus multipart/form-data.");
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return jsonError(400, "Isi unggahan tidak terbaca.");
    }

    const type = form.get("type");
    if (type !== "sticker" && type !== "background") {
      return jsonError(400, "Jenis aset harus `sticker` atau `background`.");
    }

    const label = form.get("label");
    if (typeof label !== "string" || label.trim().length === 0) {
      return jsonError(400, "Nama wajib diisi.");
    }
    if (label.trim().length > MAX_LABEL) {
      return jsonError(400, `Nama melebihi ${MAX_LABEL} karakter.`);
    }

    const categorySlug = form.get("categorySlug");
    if (typeof categorySlug !== "string" || !SLUG.test(categorySlug)) {
      return jsonError(400, "Kategori harus slug huruf kecil.");
    }

    const file = form.get("file");
    if (!(file instanceof File)) return jsonError(400, "Bidang `file` wajib diisi.");
    if (file.size === 0) return jsonError(400, "Berkas kosong.");
    if (file.size > MAX_BYTES) return jsonError(413, "Berkas terlalu besar.");

    const data = new Uint8Array(await file.arrayBuffer());
    const image = identifyImage(data);
    if (!image) {
      return jsonError(415, "Berkas bukan gambar JPEG, PNG, atau WEBP.");
    }

    try {
      const stored = await getPhotoStorage().put(data, image.extension);

      const item = await createAsset({
        type,
        label,
        categorySlug,
        storageKey: stored.key,
        width: image.width,
        height: image.height,
        premium: readFlag(form.get("premium")),
        publish: readFlag(form.get("publish")),
      });

      return Response.json({ item }, { status: 201 });
    } catch (error) {
      if (error instanceof UnknownCategoryError) {
        return jsonError(400, error.message);
      }
      if (error instanceof DuplicateSlugError) {
        // 409, not 400: the request was fine, the library disagrees. Renaming
        // is the fix, and the message says which name is taken.
        return jsonError(409, error.message);
      }
      console.error("POST /api/admin/content failed", error);
      return jsonError(500, "Aset gagal diunggah.");
    }
  },
);
