import { jsonError } from "@/lib/api/http";
import { describeMe } from "@/lib/api/me";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

/**
 * Who the caller is, and what that means.
 *
 * The app's first request: profile, role, the permissions that role holds, the
 * plan the account is on, a decision per feature, and any guest work on this
 * browser still waiting to be claimed.
 *
 * Answers 200 for a signed-out visitor rather than 401, with `profile: null` and
 * every feature refused for the stated reason. "Nobody is signed in" is a fact
 * about the caller, not a failure of the request, and the screen that has to
 * render either way should not have to tell an error apart from an answer.
 *
 * Never cached. The whole point is that it describes one specific person, and a
 * shared cache is the one place that must never hold it.
 */
export async function GET(): Promise<Response> {
  try {
    return Response.json(await describeMe(), {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    console.error("GET /api/me failed", error);
    return jsonError(500, "Data akun gagal dimuat.");
  }
}
