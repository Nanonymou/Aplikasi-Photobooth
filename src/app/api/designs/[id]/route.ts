import { isJsonObject, jsonError, readJsonBody } from "@/lib/api/http";
import { getOwnerId } from "@/lib/api/owner";
import { callerOwners } from "@/lib/api/scope";
import { validateProject } from "@/lib/api/validate-project";
import {
  deleteDesign,
  DesignConflictError,
  DesignNotFoundError,
  loadDesign,
  renameDesign,
  saveDesign,
} from "@/lib/db/designs";

export const runtime = "nodejs";

/** A design is only ever its own owner's, so nothing here may be cached shared. */
const PRIVATE = "private, no-store";

/**
 * Loads a design for the editor.
 *
 * Answers `{ project, version }`: the project the editor renders, and the
 * version its next autosave has to quote.
 *
 * The version doubles as the ETag. A design carries its photos inline, so a
 * reload is megabytes; if the browser still holds the same version there is
 * nothing to send, and `If-None-Match` turns that into a 304.
 */
export async function GET(
  request: Request,
  context: RouteContext<"/api/designs/[id]">,
): Promise<Response> {
  const { id } = await context.params;

  const owners = await callerOwners();
  if (owners.length === 0) return jsonError(404, "Desain tidak ditemukan.");

  try {
    const loaded = await loadDesign(owners, id);
    if (!loaded) return jsonError(404, "Desain tidak ditemukan.");

    const etag = `W/"${loaded.version}"`;
    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, {
        status: 304,
        headers: { etag, "cache-control": PRIVATE },
      });
    }

    return Response.json(loaded, {
      headers: { etag, "cache-control": PRIVATE },
    });
  } catch (error) {
    if (isJsonObject(error) && error.code === "22P02") {
      return jsonError(404, "Desain tidak ditemukan.");
    }
    console.error(`GET /api/designs/${id} failed`, error);
    return jsonError(500, "Desain gagal dimuat.");
  }
}

/**
 * Autosave.
 *
 * Body is `{ project, version }`: the whole document plus the version it was
 * based on. Sending the whole document is what the editor already holds, and it
 * keeps the server from having to reconstruct intent from a patch — the trade
 * is bandwidth, which the debounce in the editor already limits.
 *
 * Answers:
 *   200 { id, version, updatedAt }  saved, use the new version next time
 *   404                             not this owner's design, or deleted
 *   409 { currentVersion }          someone else saved first; the client decides
 */
export async function PUT(
  request: Request,
  context: RouteContext<"/api/designs/[id]">,
): Promise<Response> {
  const { id } = await context.params;

  // No cookie and no session means the caller owns nothing, so it cannot own
  // this one. Minting an id here would only manufacture a 404 with extra steps.
  const owners = await callerOwners();
  if (owners.length === 0) return jsonError(404, "Desain tidak ditemukan.");

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  if (!isJsonObject(body.value)) return jsonError(400, "Body bukan objek JSON.");

  const version = body.value.version;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    return jsonError(400, "Versi desain wajib disertakan.");
  }

  const validated = validateProject(body.value.project);
  if (!validated.ok) return jsonError(400, validated.error);

  try {
    const saved = await saveDesign(
      owners,
      id,
      validated.project,
      version,
      await getOwnerId(),
    );
    return Response.json(saved);
  } catch (error) {
    if (error instanceof DesignConflictError) {
      return jsonError(409, error.message, {
        currentVersion: error.currentVersion,
      });
    }
    if (error instanceof DesignNotFoundError) {
      return jsonError(404, error.message);
    }
    // An id that is not a uuid never matches a row; it is a bad request, not a
    // server fault, and PostgreSQL is the one that notices.
    if (isJsonObject(error) && error.code === "22P02") {
      return jsonError(404, "Desain tidak ditemukan.");
    }

    console.error(`PUT /api/designs/${id} failed`, error);
    return jsonError(500, "Desain gagal disimpan.");
  }
}

/** Matches the column's own limit, so a rename fails here rather than in SQL. */
const MAX_TITLE = 200;

/**
 * Renames a design.
 *
 * Only the title. Everything else about a design is its artwork, and artwork
 * arrives through PUT with a version to check against — a PATCH that quietly
 * accepted pages would be an autosave with the optimistic lock removed.
 *
 * A design that is not the caller's answers 404 rather than 403: telling a
 * stranger "this exists, but not for you" hands them the one fact they could
 * not otherwise learn.
 */
export async function PATCH(
  request: Request,
  context: RouteContext<"/api/designs/[id]">,
): Promise<Response> {
  const { id } = await context.params;

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  if (!isJsonObject(body.value)) return jsonError(400, "Body bukan objek JSON.");

  const extra = Object.keys(body.value).filter((key) => key !== "title");
  if (extra.length > 0) {
    return jsonError(
      400,
      `Hanya judul yang bisa diubah di sini: ${extra.join(", ")} ditolak.`,
    );
  }

  const title = body.value.title;
  if (typeof title !== "string" || title.trim().length === 0) {
    return jsonError(400, "Judul wajib diisi.");
  }
  if (title.trim().length > MAX_TITLE) {
    return jsonError(400, `Judul melebihi ${MAX_TITLE} karakter.`);
  }

  try {
    const owners = await callerOwners();
    const design = await renameDesign(owners, id, title);
    if (!design) return jsonError(404, "Desain tidak ditemukan.");

    return Response.json({ design }, { headers: { "cache-control": PRIVATE } });
  } catch (error) {
    if (isJsonObject(error) && error.code === "22P02") {
      return jsonError(404, "Desain tidak ditemukan.");
    }
    console.error(`PATCH /api/designs/${id} failed`, error);
    return jsonError(500, "Judul gagal diubah.");
  }
}

/**
 * Removes a design.
 *
 * Soft: the row is stamped, not dropped. A design carries the photos of people
 * who are no longer at the booth, and "I deleted the wrong one" is a sentence
 * somebody says about every gallery ever built. The sweep decides when the rows
 * actually go; this decides when they stop being yours to see.
 *
 * A second delete of the same id answers 404, which is the honest reply to
 * "remove this" when it is already gone.
 */
export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/designs/[id]">,
): Promise<Response> {
  const { id } = await context.params;

  try {
    const owners = await callerOwners();
    const removed = await deleteDesign(owners, id);
    if (!removed) return jsonError(404, "Desain tidak ditemukan.");

    return Response.json(
      { deleted: id },
      { headers: { "cache-control": PRIVATE } },
    );
  } catch (error) {
    if (isJsonObject(error) && error.code === "22P02") {
      return jsonError(404, "Desain tidak ditemukan.");
    }
    console.error(`DELETE /api/designs/${id} failed`, error);
    return jsonError(500, "Desain gagal dihapus.");
  }
}
