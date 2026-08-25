import { jsonError, readJsonBody } from "@/lib/api/http";
import { getOwnerId, requireOwnerId } from "@/lib/api/owner";
import { callerOwners } from "@/lib/api/scope";
import { validateProject } from "@/lib/api/validate-project";
import { createDesign, listDesigns } from "@/lib/db/designs";
import { getGuestSession } from "@/lib/db/guest-sessions";

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
 * empty list rather than a fresh identity: reading should not mint anything —
 * which is also why the guest session is only reported here, never created.
 *
 * Scoped to every identity the caller owns, not just this browser's cookie: a
 * signed-in account's designs are spread across the guest sessions it claimed,
 * and a list that showed only the current cookie would go empty the first time
 * someone signed in somewhere new. The session reported alongside is still this
 * browser's, because that is the one whose code and expiry the screen is about
 * to show.
 */
export async function GET(): Promise<Response> {
  const owner = await getOwnerId();
  const owners = await callerOwners();
  if (owners.length === 0) return Response.json({ designs: [], session: null });

  try {
    const [designs, session] = await Promise.all([
      listDesigns(owners),
      owner ? getGuestSession(owner) : Promise.resolve(null),
    ]);

    return Response.json(
      { designs, session },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("GET /api/designs failed", error);
    return jsonError(500, "Daftar desain gagal dimuat.");
  }
}

/**
 * Creates a design, enrolling the guest session that owns it.
 *
 * The editor calls this once — the first time a project is saved — and then
 * autosaves to `PUT /api/designs/[id]` with the id and version returned here.
 *
 * Saving is also where a walk-up guest becomes a session worth naming: the
 * response carries the short code and expiry, so the booth can tell them where
 * their work lives and how long it stays. Enrolment shares the design's own
 * transaction — a design that exists without the session that owns it would be
 * unreachable once the cookie is gone.
 */
export async function POST(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const validated = validateProject(body.value);
  if (!validated.ok) return jsonError(400, validated.error);

  try {
    const owner = await requireOwnerId();
    const { saved, session } = await createDesign(owner, validated.project);
    return Response.json({ ...saved, session }, { status: 201 });
  } catch (error) {
    console.error("POST /api/designs failed", error);
    return jsonError(500, "Desain gagal disimpan.");
  }
}
