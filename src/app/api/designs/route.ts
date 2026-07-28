import { jsonError, readJsonBody } from "@/lib/api/http";
import { requireOwnerId } from "@/lib/api/owner";
import { validateProject } from "@/lib/api/validate-project";
import { createDesign } from "@/lib/db/designs";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

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
