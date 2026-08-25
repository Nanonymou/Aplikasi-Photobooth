import { jsonError, readJsonBody } from "@/lib/api/http";
import { signIn } from "@/lib/api/sign-in";
import type { AuthProvider } from "@/lib/db/user-profiles";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Only the social providers land here; email sign-in has its own route. */
const PROVIDERS = new Set<AuthProvider>(["google", "apple"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function optionalString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" || trimmed.length > max ? null : trimmed;
}

/**
 * Completes a social sign-in and syncs the profile.
 *
 * The browser comes back from Google or Apple, and this is where that becomes a
 * session: the identity is recorded against a profile, the account cookie is
 * set, and any guest work follows the user into their account — all through the
 * same `signIn` the email route uses, so the two cannot drift.
 *
 * The provider's own token exchange is not here yet: Supabase performs it and
 * hands back a verified profile (see supabase/config.toml). Until that is wired,
 * this route accepts the profile shape that exchange produces. What it will not
 * do is trust the shape blindly — the provider must be one we actually offer,
 * and the email must look like an email, because everything downstream keys off
 * it.
 *
 * Note what is deliberately absent: no `role` is read from the body. A caller
 * who could name their own role would be a caller who could make themselves an
 * admin; roles are granted in this app, never asserted by a sign-in.
 */
export async function POST(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  if (!isRecord(body.value)) return jsonError(400, "Body bukan objek JSON.");

  const provider = body.value.provider;
  if (
    typeof provider !== "string" ||
    !PROVIDERS.has(provider as AuthProvider)
  ) {
    return jsonError(400, "Penyedia masuk tidak dikenali.");
  }

  const email = body.value.email;
  if (typeof email !== "string" || !EMAIL.test(email.trim())) {
    return jsonError(400, "Email dari penyedia tidak valid.");
  }

  const avatar = optionalString(body.value.avatarUrl, 2048);

  try {
    const { profile, claimed } = await signIn({
      email: email.trim(),
      provider: provider as AuthProvider,
      displayName: optionalString(body.value.displayName, 120),
      // The column only accepts https; dropping anything else here keeps a
      // provider's odd payload from turning a sign-in into a 500.
      avatarUrl: avatar?.startsWith("https://") ? avatar : null,
    });

    return Response.json({ profile, claimed });
  } catch (error) {
    console.error("POST /api/auth/oauth/callback failed", error);
    return jsonError(500, "Masuk lewat penyedia gagal diselesaikan.");
  }
}
