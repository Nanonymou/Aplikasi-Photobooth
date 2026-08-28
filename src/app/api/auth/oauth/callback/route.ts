import { jsonError } from "@/lib/api/http";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

/**
 * Where a social sign-in would be completed — and, until it can be, refused.
 *
 * This route used to take the email out of the request body and sign that
 * account in. There was nothing else to it: no provider, no token exchange, no
 * proof. So `POST {"provider":"google","email":"<any address>"}` returned a
 * session cookie for that account, and naming the administrator's address made
 * the caller an administrator. Measured against this codebase, unauthenticated,
 * in one request.
 *
 * The email is the whole identity here, so the only safe version of this
 * endpoint is one where the email comes from the provider rather than the
 * caller. That exchange is Supabase's to perform (see supabase/config.toml) and
 * it is not installed — no client, no keys, no verification anywhere in this
 * repository — so there is no configuration that could make this request
 * trustworthy today, and it is refused outright rather than gated behind a flag
 * somebody could set by mistake.
 *
 * To bring it back: perform the code-for-profile exchange with the provider,
 * and call `signIn` from `@/lib/api/sign-in` with the verified address. Nothing
 * else in the sign-in path needs to change — the email route already uses it,
 * and roles are granted in this app, never asserted by a sign-in.
 */
export function POST(): Response {
  return jsonError(
    503,
    "Masuk dengan Google atau Apple belum aktif di instalasi ini. Gunakan tautan masuk lewat email.",
  );
}
