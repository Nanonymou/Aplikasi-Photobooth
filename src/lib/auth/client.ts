"use client";

/**
 * The auth API, as the browser calls it.
 *
 * Every screen that signs somebody in or out goes through here, so the endpoint
 * a form talks to is stated once rather than assembled inline in eight
 * components. It replaces `mock-auth`, whose bodies imitated these calls before
 * the endpoints existed.
 *
 * There is no password anywhere in it, and that is the product's decision rather
 * than an omission: the PRD asks for "Login Tanpa Kata Sandi (Magic Link)" and
 * social SSO, the schema stores no password column, and the server offers no
 * endpoint to check one against.
 */

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What every screen needs about who just signed in. */
export interface Account {
  id: string;
  email: string;
  name: string;
}

export class AuthError extends Error {}

interface ProfileShape {
  id: string;
  email: string;
  displayName?: string | null;
}

/** A profile as the API returns it, in the shape the screens use. */
function toAccount(profile: ProfileShape): Account {
  return {
    id: profile.id,
    email: profile.email,
    // The part before the @ is a better greeting than the whole address, and
    // better than "Pengguna" for somebody who never set a display name.
    name: profile.displayName?.trim() || profile.email.split("@")[0],
  };
}

/**
 * Calls the API and turns a refusal into an `AuthError` carrying its message.
 *
 * The endpoints already answer `{ error }` with a fitting status and wording
 * written for the person reading it — "Tautan ini sudah dipakai", not "401" —
 * so the screens show what the server said instead of inventing their own
 * sentence for each status code and drifting from it.
 */
async function call<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: body === undefined ? {} : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new AuthError("Tidak bisa menghubungi server. Cek koneksimu.");
  }

  const payload: unknown = await response.json().catch(() => null);
  const data =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : {};

  if (!response.ok) {
    throw new AuthError(
      typeof data.error === "string" ? data.error : "Terjadi kesalahan. Coba lagi.",
    );
  }

  return data as T;
}

/**
 * Asks for a sign-in link.
 *
 * The response says whether the mail actually left the building. An install
 * with no mail provider configured puts the link in the server log instead, and
 * a screen that cannot say so leaves somebody refreshing an inbox that will
 * never receive anything.
 */
export async function sendMagicLink(
  email: string,
): Promise<{ delivered: boolean; expiresAt: string }> {
  const result = await call<{ delivered: boolean; expiresAt: string }>(
    "/api/auth/magic-link",
    { email: email.trim() },
  );
  return { delivered: result.delivered, expiresAt: result.expiresAt };
}

/** What a sign-in brought over from this browser's guest session. */
export interface Claimed {
  designs: number;
  photos: number;
}

export interface SignedIn {
  account: Account;
  claimed: Claimed | null;
}

/** Redeems the token from the link, which is where signing in actually happens. */
export async function verifyMagicLink(
  token: string | null,
): Promise<SignedIn> {
  if (!token?.trim()) throw new AuthError("Tautan tidak lengkap.");

  const result = await call<{ profile: ProfileShape; claimed: Claimed | null }>(
    "/api/auth/magic-link/verify",
    { token: token.trim() },
  );
  return { account: toAccount(result.profile), claimed: result.claimed };
}

/** The identity providers offered on the auth screens. */
export type SsoProvider = "google" | "apple";

export const SSO_PROVIDERS: { id: SsoProvider; label: string }[] = [
  { id: "google", label: "Google" },
  { id: "apple", label: "Apple" },
];

/** The route the provider redirects back to once the guest has consented. */
export const OAUTH_CALLBACK_PATH = "/masuk-sosial/callback";

/** The provider's display name, or null if the id is not one we offer. */
export function providerLabel(provider: string | null): string | null {
  return SSO_PROVIDERS.find((p) => p.id === provider)?.label ?? null;
}


/**
 * Completes the OAuth round trip from the callback.
 *
 * The address is never carried here: the server takes it from the provider or
 * refuses. A caller who could name their own email would be a caller who could
 * sign in as anyone.
 */
export async function completeOAuth(params: {
  provider: string | null;
  code: string | null;
  error: string | null;
}): Promise<SignedIn> {
  if (params.error) throw new AuthError("Masuk dibatalkan atau izin ditolak.");

  const label = providerLabel(params.provider);
  if (!label) throw new AuthError("Penyedia masuk tidak dikenali.");
  if (!params.code) {
    throw new AuthError("Callback tidak lengkap. Coba ulangi masuk.");
  }

  const result = await call<{ profile: ProfileShape; claimed: Claimed | null }>(
    "/api/auth/oauth/callback",
    { provider: params.provider, code: params.code },
  );
  return { account: toAccount(result.profile), claimed: result.claimed };
}

/** Ends the session on this device. The cookie is the server's to clear. */
export async function logout(): Promise<void> {
  await call("/api/auth/logout");
}

/** Moves this browser's guest work into the account that just signed in. */
export async function claimSession(
  code: string,
): Promise<{ designs: number; photos: number }> {
  const result = await call<{ designs: number; photos: number }>(
    "/api/guest/claim",
    { code: code.trim().toUpperCase() },
  );
  return { designs: result.designs, photos: result.photos };
}

/**
 * Who the server thinks this browser is, or null.
 *
 * A GET, unlike everything else here, and the one call a screen makes to find
 * out whether it is already signed in.
 */
export async function readSession(): Promise<Account | null> {
  try {
    const response = await fetch("/api/auth/session", { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      account: { id: string; email: string } | null;
    };
    return data.account ? toAccount(data.account) : null;
  } catch {
    return null;
  }
}

/**
 * Where a signed-in user lands. A single constant so the real dashboard, when
 * it exists, is a one-line repoint rather than a hunt through call sites; for
 * now the editor is the app's home.
 */
export const POST_LOGIN_REDIRECT = "/editor";

/** Where a signed-out user lands. Kept beside its counterpart so they cannot drift. */
export const POST_LOGOUT_REDIRECT = "/masuk";
