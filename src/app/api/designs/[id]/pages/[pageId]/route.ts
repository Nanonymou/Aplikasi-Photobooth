import { jsonError, readJsonBody } from "@/lib/api/http";
import { callerOwners } from "@/lib/api/scope";
import { validatePage } from "@/lib/api/validate-project";
import {
  DesignConflictError,
  DesignNotFoundError,
  removeDesignPage,
  savePageContent,
  turnDesignPage,
} from "@/lib/db/designs";
import type { CanvasPage, PageOrientation } from "@/types/editor";

export const runtime = "nodejs";

const ORIENTATIONS: PageOrientation[] = ["portrait", "landscape"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Autosave, for one page.
 *
 * `PUT /api/designs/[id]` saves the whole document, which is what the editor
 * holds and the right shape for "everything changed". This is the other case,
 * and it is the common one: a project of five photostrips re-uploads four pages
 * of inline photos every time somebody nudges a sticker on the fifth.
 *
 * Same contract as the wide save otherwise — `{ version, page }` in,
 * `{ id, version, updatedAt }` out, 409 with the current version when the
 * document moved underneath. The version is the *design's*, because two people
 * editing different pages still have to find out about each other.
 *
 * The page has to exist. Creating one is `POST .../pages`, and a save that
 * quietly created a page would turn a stale client's retry into a duplicate.
 */
export async function PUT(
  request: Request,
  context: RouteContext<"/api/designs/[id]/pages/[pageId]">,
): Promise<Response> {
  const { id, pageId } = await context.params;

  const owners = await callerOwners();
  if (owners.length === 0) return jsonError(404, "Desain tidak ditemukan.");

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  if (!isRecord(body.value)) return jsonError(400, "Body bukan objek.");

  const version = body.value.version;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    return jsonError(400, "`version` wajib berupa bilangan bulat.");
  }

  const page = body.value.page;
  // The same validator the whole-document save uses, so this cannot become a
  // way in for a page that one would refuse.
  const problem = validatePage({ ...(isRecord(page) ? page : {}), id: pageId }, 0);
  if (problem) return jsonError(400, `Halaman tidak valid: ${problem}.`);

  const valid = page as unknown as CanvasPage;

  try {
    const saved = await savePageContent(
      owners,
      id,
      pageId,
      {
        name: valid.name,
        width: valid.width,
        height: valid.height,
        background: valid.background,
        objects: valid.objects,
        effects: valid.effects,
        templateId: valid.templateId ?? null,
      },
      version,
    );

    return Response.json(saved, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof DesignConflictError) {
      return jsonError(409, "Desain sudah berubah di tempat lain.", {
        version: error.currentVersion,
      });
    }
    if (error instanceof DesignNotFoundError) {
      return jsonError(404, "Desain atau halaman tidak ditemukan.");
    }
    console.error(`PUT /api/designs/${id}/pages/${pageId} failed`, error);
    return jsonError(500, "Halaman gagal disimpan.");
  }
}

/**
 * Turns a page portrait or landscape.
 *
 * A page's size and its layout move together — turning it swaps the one and
 * refits the other — so this is one request rather than a size edit the caller
 * has to follow with a re-layout of its own.
 *
 * A page that is already that way round, or a square, answers 200 with
 * `changed: false` and no version bump. It is not an error to ask for the state
 * something is already in, and reporting one would have the editor believe its
 * document had gone stale when nothing was written.
 */
export async function PATCH(
  request: Request,
  context: RouteContext<"/api/designs/[id]/pages/[pageId]">,
): Promise<Response> {
  const { id, pageId } = await context.params;

  const owners = await callerOwners();
  if (owners.length === 0) return jsonError(404, "Desain tidak ditemukan.");

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  if (!isRecord(body.value)) return jsonError(400, "Body bukan objek.");

  const extra = Object.keys(body.value).filter((key) => key !== "orientation");
  if (extra.length > 0) {
    return jsonError(400, `Bidang tidak dikenal: ${extra.join(", ")}.`);
  }

  const orientation = body.value.orientation;
  if (!ORIENTATIONS.includes(orientation as PageOrientation)) {
    return jsonError(
      400,
      `Orientasi harus salah satu dari: ${ORIENTATIONS.join(", ")}.`,
    );
  }

  try {
    const result = await turnDesignPage(
      owners,
      id,
      pageId,
      orientation as PageOrientation,
    );

    if (result === "not-found") {
      return jsonError(404, "Desain atau halaman tidak ditemukan.");
    }
    if (result === "unchanged") {
      return Response.json(
        { changed: false },
        { headers: { "cache-control": "private, no-store" } },
      );
    }

    return Response.json(
      { changed: true, ...result },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error(`PATCH /api/designs/${id}/pages/${pageId} failed`, error);
    return jsonError(500, "Orientasi halaman gagal diubah.");
  }
}

/**
 * Removes a page.
 *
 * The last page is refused with a 409 rather than a 400: nothing about the
 * request is malformed, the design is simply in a state where it cannot be
 * granted. The editor hides the button in that state, so anybody reaching here
 * is a second tab or a script — and both deserve to be told which it is.
 *
 * The answer carries the page that takes its place and the design's new version.
 * The caller needs both: one to know where to land, the other so its next
 * autosave does not resurrect the page it just deleted.
 */
export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/designs/[id]/pages/[pageId]">,
): Promise<Response> {
  const { id, pageId } = await context.params;

  const owners = await callerOwners();
  if (owners.length === 0) return jsonError(404, "Desain tidak ditemukan.");

  try {
    const result = await removeDesignPage(owners, id, pageId);

    if (result === "not-found") {
      return jsonError(404, "Desain atau halaman tidak ditemukan.");
    }
    if (result === "last-page") {
      return jsonError(
        409,
        "Halaman terakhir tidak bisa dihapus — sebuah desain harus punya setidaknya satu halaman.",
      );
    }

    return Response.json(result, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    console.error(`DELETE /api/designs/${id}/pages/${pageId} failed`, error);
    return jsonError(500, "Halaman gagal dihapus.");
  }
}
