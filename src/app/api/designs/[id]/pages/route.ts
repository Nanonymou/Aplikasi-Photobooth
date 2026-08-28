import { jsonError, readJsonBody } from "@/lib/api/http";
import { callerOwners } from "@/lib/api/scope";
import { addDesignPage, listDesignPages } from "@/lib/db/designs";

export const runtime = "nodejs";

/**
 * A project's pages, as a list.
 *
 * The same 404 as the design itself when the caller does not own it, and for the
 * same reason: "you may not see this" and "this does not exist" are the same
 * answer to somebody guessing ids, and telling them apart is how a guess becomes
 * a confirmation.
 *
 * Deliberately not the whole document. `GET /api/designs/[id]` is what the
 * editor loads to render; this is what a strip, a page picker, or a "jump to
 * page" needs, and none of them want the megabytes of photo data that the
 * objects carry. What comes back instead is the shape of each page and a count
 * of what is on it — enough to draw a chip and to say "3 dari 4 slot terisi".
 */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/designs/[id]/pages">,
): Promise<Response> {
  const { id } = await context.params;

  const owners = await callerOwners();
  if (owners.length === 0) return jsonError(404, "Desain tidak ditemukan.");

  try {
    const pages = await listDesignPages(owners, id);
    if (!pages) return jsonError(404, "Desain tidak ditemukan.");

    return Response.json(
      { pages },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error(`GET /api/designs/${id}/pages failed`, error);
    return jsonError(500, "Daftar halaman gagal dimuat.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const FIELDS = ["after", "copyOf", "name", "width", "height"];

/** Matches the column's own bounds, so a bad size is refused before the insert. */
const MIN_EDGE = 16;
const MAX_EDGE = 20000;

function optionalId(value: unknown, field: string): string | null | { error: string } {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.trim().length === 0) {
    return { error: `\`${field}\` harus id halaman.` };
  }
  return value;
}

function optionalEdge(value: unknown, field: string): number | null | { error: string } {
  if (value === undefined || value === null) return null;
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < MIN_EDGE ||
    value > MAX_EDGE
  ) {
    return { error: `\`${field}\` harus bilangan bulat ${MIN_EDGE}–${MAX_EDGE}.` };
  }
  return value;
}

/**
 * Adds a page.
 *
 * `copyOf` is why this endpoint exists: a page's objects carry their photos
 * inline, so copying one through the browser means sending megabytes out and
 * posting the same megabytes straight back. Done here, the bytes never move.
 * Blank pages ride along because they are the same insert with an empty array.
 *
 * A page built from a template is not this endpoint's job — that logic lives in
 * the editor, and a second copy of it here would be a second answer to what a
 * template means. The editor builds the page and autosaves the document.
 *
 * The answer carries the design's new version. An editor that adds a page this
 * way has to quote it on its next save, or its autosave would overwrite the page
 * it just asked for.
 */
export async function POST(
  request: Request,
  context: RouteContext<"/api/designs/[id]/pages">,
): Promise<Response> {
  const { id } = await context.params;

  const owners = await callerOwners();
  if (owners.length === 0) return jsonError(404, "Desain tidak ditemukan.");

  // A bare POST is the common case — "give me another page" — so no body at all
  // is a request, not a mistake, and it never reaches the JSON parser.
  const empty = Number(request.headers.get("content-length") ?? "0") === 0;

  let value: unknown = {};
  if (!empty) {
    const body = await readJsonBody(request);
    if (!body.ok) return body.response;
    value = body.value ?? {};
  }

  if (!isRecord(value)) return jsonError(400, "Body bukan objek.");

  const extra = Object.keys(value).filter((key) => !FIELDS.includes(key));
  if (extra.length > 0) {
    return jsonError(400, `Bidang tidak dikenal: ${extra.join(", ")}.`);
  }

  const after = optionalId(value.after, "after");
  if (isRecord(after)) return jsonError(400, after.error as string);
  const copyOf = optionalId(value.copyOf, "copyOf");
  if (isRecord(copyOf)) return jsonError(400, copyOf.error as string);
  const width = optionalEdge(value.width, "width");
  if (isRecord(width)) return jsonError(400, width.error as string);
  const height = optionalEdge(value.height, "height");
  if (isRecord(height)) return jsonError(400, height.error as string);

  const name = value.name;
  if (name !== undefined && name !== null && typeof name !== "string") {
    return jsonError(400, "`name` harus teks.");
  }
  if (typeof name === "string" && name.trim().length > 200) {
    return jsonError(400, "Nama halaman maksimal 200 karakter.");
  }

  try {
    const added = await addDesignPage(owners, id, {
      after: after as string | null,
      copyOf: copyOf as string | null,
      name: (name as string | undefined) ?? null,
      width: width as number | null,
      height: height as number | null,
    });
    // Null covers both "no such design" and "no such page to copy". Neither is
    // worth telling apart to somebody guessing.
    if (!added) return jsonError(404, "Desain atau halaman tidak ditemukan.");

    return Response.json(added, {
      status: 201,
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    console.error(`POST /api/designs/${id}/pages failed`, error);
    return jsonError(500, "Halaman gagal ditambahkan.");
  }
}
