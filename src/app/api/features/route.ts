import { jsonError } from "@/lib/api/http";
import { allFeatureAccess, featureContext } from "@/lib/api/features";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

/**
 * What the caller may actually use.
 *
 * One answer for the whole app, so a screen dims a button because the server
 * said so rather than because it re-derived the rules and got the same result
 * by luck. Each entry carries *why* it was refused, which is the part a client
 * cannot work out on its own: a role wall and a paywall look identical from
 * outside, and only one of them is worth showing an upgrade button for.
 *
 * Open to anyone, signed in or not: it describes the caller's own access and
 * nothing else. A signed-out visitor learns that they need to sign in, which is
 * the thing the screen has to tell them anyway.
 */
export async function GET(): Promise<Response> {
  try {
    const [context, features] = await Promise.all([
      featureContext(),
      allFeatureAccess(),
    ]);

    return Response.json(
      {
        features,
        plan: context.plan,
        role: context.viewer?.profile.role ?? null,
      },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("GET /api/features failed", error);
    return jsonError(500, "Daftar akses fitur gagal dimuat.");
  }
}
