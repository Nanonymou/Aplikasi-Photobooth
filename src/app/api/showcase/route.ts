import { getAccountId } from "@/lib/api/account";
import { jsonError, readJsonBody } from "@/lib/api/http";
import { getOwnerId } from "@/lib/api/owner";
import { callerOwners } from "@/lib/api/scope";
import { loadDesign } from "@/lib/db/designs";
import { describeMe } from "@/lib/api/me";
import {
  listShowcase,
  publishDesign,
  SHOWCASE_CATEGORIES,
  type ShowcaseCategory,
} from "@/lib/db/showcase";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

const SORTS = ["terbaru", "populer", "remix"] as const;
const MAX_LIMIT = 100;
const MAX_TAGS = 8;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * The wall.
 *
 * Public, like the page it feeds: this is what a stranger arriving from a shared
 * link sees, and a sign-in wall in front of it is a wall in front of the only
 * page that recruits anybody.
 *
 * The caller's owner id is used only to answer "have you liked this" per card —
 * a question a counter cannot answer, and one a signed-out visitor is still
 * entitled to have answered, since they can like things too.
 */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;

  const category = params.get("kategori");
  if (category && !SHOWCASE_CATEGORIES.includes(category as ShowcaseCategory)) {
    // An unknown category returns nothing rather than everything: a filter that
    // silently stops filtering is worse than one that says it found nothing.
    return Response.json({ items: [] }, { headers: { "cache-control": "no-store" } });
  }

  const sort = params.get("urut");
  const asked = Number(params.get("limit") ?? 60);
  const limit = Number.isInteger(asked)
    ? Math.min(Math.max(asked, 1), MAX_LIMIT)
    : 60;

  try {
    const items = await listShowcase({
      category: (category as ShowcaseCategory) ?? null,
      sort: SORTS.includes(sort as (typeof SORTS)[number])
        ? (sort as (typeof SORTS)[number])
        : "populer",
      search: params.get("q"),
      limit,
      viewer: await getOwnerId(),
    });

    return Response.json(
      { items },
      // Per-visitor, because each card says whether *they* liked it.
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("GET /api/showcase failed", error);
    return jsonError(500, "Galeri publik gagal dimuat.");
  }
}

/**
 * Publishes one of the caller's designs.
 *
 * Signing in is required, and not as a formality: publishing puts a name on a
 * public page, and a name needs an account behind it. The design must be the
 * caller's — checked in the database, never taken from the request — because
 * publishing somebody else's work under your own name is the one thing a
 * showcase must never allow.
 *
 * The size comes from the design's first page rather than the body: it is the
 * shape the wall draws each card in, and a caller who could name it could make
 * their card any size they liked.
 */
export async function POST(request: Request): Promise<Response> {
  const accountId = await getAccountId();
  if (!accountId) return jsonError(401, "Masuk dulu untuk memublikasikan.");

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  if (!isRecord(body.value)) return jsonError(400, "Body bukan objek.");

  const fields = ["designId", "title", "category", "tags"];
  const extra = Object.keys(body.value).filter((key) => !fields.includes(key));
  if (extra.length > 0) {
    return jsonError(400, `Bidang tidak dikenal: ${extra.join(", ")}.`);
  }

  const designId = body.value.designId;
  if (typeof designId !== "string" || designId.length === 0) {
    return jsonError(400, "`designId` wajib diisi.");
  }

  const title = body.value.title;
  if (typeof title !== "string" || title.trim().length === 0) {
    return jsonError(400, "Judul wajib diisi.");
  }
  if (title.trim().length > 160) {
    return jsonError(400, "Judul maksimal 160 karakter.");
  }

  const category = body.value.category;
  if (!SHOWCASE_CATEGORIES.includes(category as ShowcaseCategory)) {
    return jsonError(
      400,
      `Kategori harus salah satu dari: ${SHOWCASE_CATEGORIES.join(", ")}.`,
    );
  }

  const rawTags = body.value.tags ?? [];
  if (
    !Array.isArray(rawTags) ||
    rawTags.length > MAX_TAGS ||
    rawTags.some((tag) => typeof tag !== "string" || tag.trim().length === 0)
  ) {
    return jsonError(400, `Tag maksimal ${MAX_TAGS} dan berupa teks.`);
  }
  const tags = (rawTags as string[]).map((tag) => tag.trim().toLowerCase());

  try {
    const [me, owners] = await Promise.all([describeMe(), callerOwners()]);
    const loaded = await loadDesign(owners, designId);
    if (!loaded) return jsonError(404, "Desain tidak ditemukan.");

    const first = loaded.project.pages[0];
    if (!first) return jsonError(409, "Desain ini belum punya halaman.");

    const result = await publishDesign({
      designId,
      owners,
      accountId,
      authorName: me.profile?.displayName ?? me.profile?.email ?? "Anonim",
      title,
      category: category as ShowcaseCategory,
      tags,
      width: first.width,
      height: first.height,
    });

    if (!result.ok) return jsonError(403, "Desain ini bukan milikmu.");

    return Response.json({ item: result.item }, { status: 201 });
  } catch (error) {
    console.error("POST /api/showcase failed", error);
    return jsonError(500, "Desain gagal dipublikasikan.");
  }
}
