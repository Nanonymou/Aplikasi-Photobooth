import { jsonError, readJsonBody } from "@/lib/api/http";
import { getOwnerId } from "@/lib/api/owner";
import { validateProject } from "@/lib/api/validate-project";
import {
  DesignConflictError,
  DesignNotFoundError,
  loadDesign,
  saveDesign,
} from "@/lib/db/designs";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

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

  const owner = await getOwnerId();
  if (!owner) return jsonError(404, "Desain tidak ditemukan.");

  try {
    const loaded = await loadDesign(owner, id);
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
    if (isRecord(error) && error.code === "22P02") {
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

  // No cookie means this browser has never created a design, so it cannot own
  // this one. Minting an id here would only manufacture a 404 with extra steps.
  const owner = await getOwnerId();
  if (!owner) return jsonError(404, "Desain tidak ditemukan.");

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  if (!isRecord(body.value)) return jsonError(400, "Body bukan objek JSON.");

  const version = body.value.version;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    return jsonError(400, "Versi desain wajib disertakan.");
  }

  const validated = validateProject(body.value.project);
  if (!validated.ok) return jsonError(400, validated.error);

  try {
    const saved = await saveDesign(owner, id, validated.project, version);
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
    if (isRecord(error) && error.code === "22P02") {
      return jsonError(404, "Desain tidak ditemukan.");
    }

    console.error(`PUT /api/designs/${id} failed`, error);
    return jsonError(500, "Desain gagal disimpan.");
  }
}
