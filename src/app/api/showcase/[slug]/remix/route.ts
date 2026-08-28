import { jsonError } from "@/lib/api/http";
import { requireOwnerId } from "@/lib/api/owner";
import { callerOwners } from "@/lib/api/scope";
import { remixDesign } from "@/lib/db/showcase";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

/**
 * Starts a design from a published one.
 *
 * Its own address rather than a flag on "create a design", for the same reason
 * duplicating has one: it creates a resource, the answer is the design the
 * editor should open, and a verb hidden in a request body is a verb nobody
 * finds.
 *
 * No account needed for a free template, which is nearly all of them. Remixing
 * is how a stranger who arrived from a shared link starts making something, and
 * asking them to sign up first is asking them to leave — the copy is filed under
 * the owner id their browser already carries, which comes with them if they sign
 * in later.
 *
 * A paid one answers 402 with its price. Remixing is the whole of what a template
 * seller sells, so this is where a licence is worth anything; the reply carries
 * the price so the button that got a refusal can turn into the one that buys.
 *
 * The copy is made in the database. A design is megabytes of inline photos, and
 * sending them to the browser only to have them posted straight back is the most
 * expensive possible way to say "again".
 */
export async function POST(
  _request: Request,
  context: RouteContext<"/api/showcase/[slug]/remix">,
): Promise<Response> {
  const { slug } = await context.params;

  try {
    const ownerId = await requireOwnerId();
    const owners = await callerOwners();
    const result = await remixDesign(
      ownerId,
      slug,
      owners.includes(ownerId) ? owners : [...owners, ownerId],
    );

    if (!result.ok) {
      if (result.reason === "unlicensed") {
        return jsonError(402, "Template ini berbayar. Beli dulu untuk remix.", {
          price: result.price,
        });
      }
      return jsonError(404, "Karya tidak ditemukan.");
    }

    return Response.json(result.remix, {
      status: 201,
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    console.error(`POST /api/showcase/${slug}/remix failed`, error);
    return jsonError(500, "Remix gagal dibuat.");
  }
}
