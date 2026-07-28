import { jsonError, readJsonBody } from "@/lib/api/http";
import { getOwnerId, requireOwnerId } from "@/lib/api/owner";
import { validateProject } from "@/lib/api/validate-project";
import { createDesign, listDesigns } from "@/lib/db/designs";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

/**
 * The caller's designs, newest first.
 *
 * Summaries only — title, size, page count. Loading a design's artwork is
 * `GET /api/designs/[id]`, because a list of ten would otherwise carry every
 * photo in all of them.
 *
 * A browser that has never saved anything has no owner cookie, and gets an
 * empty list rather than a fresh identity: reading should not mint anything.
 */
export async function GET(): Promise<Response> {
  const owner = await getOwnerId();
  if (!owner) return Response.json({ designs: [] });

  try {
    return Response.json(
      { designs: await listDesigns(owner) },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("GET /api/designs failed", error);
    return jsonError(500, "Daftar desain gagal dimuat.");
  }
}

/**
 * Creates a design.
 *
 * The editor calls this once — the first time a project is saved — and then
 * autosaves to `PUT /api/designs/[id]` with the id and version returned here.
 */
export async function POST(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const validated = validateProject(body.value);
  if (!validated.ok) return jsonError(400, validated.error);

  try {
    const owner = await requireOwnerId();
    const saved = await createDesign(owner, validated.project);
    return Response.json(saved, { status: 201 });
  } catch (error) {
    console.error("POST /api/designs failed", error);
    return jsonError(500, "Desain gagal disimpan.");
  }
}
