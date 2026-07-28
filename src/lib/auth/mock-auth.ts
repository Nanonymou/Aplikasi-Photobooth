"use client";

/**
 * Client-side stand-in for the auth API.
 *
 * The frontend is built before the backend, so login and register are wired
 * against the contract they will eventually call — `POST /api/auth/login` and
 * `POST /api/auth/register`, each returning the signed-in account — rather than
 * against nothing. These functions imitate that contract, including a failure,
 * so the forms exercise both paths for real. When the endpoints land they
 * replace the two bodies here and the forms do not move.
 */

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Long enough to be worth the name; the real policy is the server's. */
export const MIN_PASSWORD = 8;

export interface Account {
  name: string;
  email: string;
}

export class AuthError extends Error {}

const LATENCY_MS = 700;

function wait() {
  return new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
}

/**
 * A demo account, so the mock can show a failure without a backend: this one
 * address "already exists" for register and is the only one that "works" with a
 * wrong password on login.
 */
const KNOWN_EMAIL = "demo@framestudio.id";

export async function login(email: string, password: string): Promise<Account> {
  await wait();

  // One canned wrong-credentials case, so the error path is a real path.
  if (email.trim().toLowerCase() === KNOWN_EMAIL && password !== "framestudio") {
    throw new AuthError("Email atau kata sandi salah.");
  }

  return { name: email.split("@")[0], email: email.trim() };
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<Account> {
  await wait();
  void password;

  if (email.trim().toLowerCase() === KNOWN_EMAIL) {
    throw new AuthError("Email ini sudah terdaftar. Coba masuk saja.");
  }

  return { name: name.trim(), email: email.trim() };
}

/**
 * Where a signed-in user lands. A single constant so the real dashboard, when
 * it exists, is a one-line repoint rather than a hunt through call sites; for
 * now the editor is the app's home.
 */
export const POST_LOGIN_REDIRECT = "/editor";

/**
 * Where a signed-out user lands: the login screen. Its counterpart to
 * `POST_LOGIN_REDIRECT`, kept beside it so the pair never drifts.
 */
export const POST_LOGOUT_REDIRECT = "/masuk";

/**
 * Client marker that a signed-in session exists on this device.
 *
 * The mock login flows will set it and logout clears it; it is deliberately the
 * account's own key, separate from the guest session, so signing out ends the
 * account without touching a guest's device-local work.
 */
export const AUTH_SESSION_KEY = "framestudio:auth:v1";

/** Drops the client's record of the signed-in session. */
export function clearSession(): void {
  try {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
  } catch {
    // Storage blocked (private mode): there is nothing stored to clear.
  }
}

/**
 * Verifies a magic-link token.
 *
 * Stand-in for `GET /api/auth/magic-link/verify?token=…`: the backend looks the
 * token's hash up, checks it is unused and unexpired, consumes it, and starts a
 * session. Here the token string itself picks the outcome so every branch — a
 * missing token, an expired one, a forged one, a good one — is reachable from
 * the callback page. When the endpoint lands it replaces this body.
 */
export async function verifyMagicLink(
  token: string | null,
): Promise<Account> {
  await wait();

  if (!token) throw new AuthError("Tautan tidak lengkap.");
  if (token.startsWith("expired")) {
    throw new AuthError("Tautan ini sudah kedaluwarsa. Minta yang baru.");
  }
  if (token.startsWith("invalid")) {
    throw new AuthError("Tautan tidak valid atau sudah dipakai.");
  }

  return { name: "Tamu", email: "" };
}

/**
 * Sends a one-time sign-in link to an email.
 *
 * Stand-in for `POST /api/auth/magic-link { email }`: the backend mints a short-
 * lived token, stores its hash, and mails a link that carries it. Here it only
 * pauses and rejects one canned address, so the form's sent-state and its error
 * path are both real. What the user sees does not move when the endpoint lands.
 */
export async function sendMagicLink(email: string): Promise<void> {
  await wait();

  // One address that cannot receive mail, so "gagal terkirim" is a real branch.
  if (email.trim().toLowerCase().endsWith("@nomail.test")) {
    throw new AuthError("Alamat email ini tidak dapat menerima tautan.");
  }
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
 * Where the SSO button sends the browser to begin auth.
 *
 * The real button leaves for the provider's consent screen; the provider then
 * redirects back to `OAUTH_CALLBACK_PATH` with an authorization `code`. There is
 * no provider yet, so the mock resolves that first hop straight to our own
 * callback carrying a demo code — the whole redirect round trip is exercised
 * in-app, and swapping in the real authorize URL later is a one-line change.
 */
export function oauthAuthorizeUrl(provider: SsoProvider): string {
  const query = new URLSearchParams({ provider, code: "demo" });
  return `${OAUTH_CALLBACK_PATH}?${query.toString()}`;
}

/**
 * Completes the OAuth round trip from the callback.
 *
 * Stand-in for the callback's code-for-session exchange — the backend swaps the
 * provider's `code` for tokens, reads the profile, and links or creates the
 * account. Here the query itself picks the outcome so every branch the callback
 * can hit is reachable: the provider reporting a denial (`error`), an unknown
 * provider, a missing or spent `code`, and the good path. When the endpoint
 * lands it replaces this body.
 */
export async function completeOAuth(params: {
  provider: string | null;
  code: string | null;
  error: string | null;
}): Promise<Account> {
  await wait();

  const { provider, code, error } = params;
  if (error) throw new AuthError("Masuk dibatalkan atau izin ditolak.");

  const label = providerLabel(provider);
  if (!label) throw new AuthError("Penyedia masuk tidak dikenali.");
  if (!code) throw new AuthError("Callback tidak lengkap. Coba ulangi masuk.");
  if (code.startsWith("invalid")) {
    throw new AuthError("Sesi masuk tidak valid atau kedaluwarsa. Coba lagi.");
  }

  return { name: `Pengguna ${label}`, email: `${provider}@contoh.id` };
}

/**
 * Ends the signed-in session.
 *
 * Stand-in for `POST /api/auth/logout`: the backend clears the session cookie so
 * the device is no longer authenticated. Here it only pauses — there is no real
 * cookie yet — but the call sits in the flow so "sign out" already awaits the
 * server the way it will. Wiping the guest's device-local work is a separate,
 * client-only step the caller runs alongside this.
 */
export async function logout(): Promise<void> {
  await wait();
}

/**
 * Moves a device's guest work into the account that just signed in.
 *
 * Stand-in for `POST /api/account/claim { sessionCode }`, run right after auth:
 * the backend takes every design and photo stamped with the anonymous
 * `owner_id` behind that session and re-stamps it with the account's. Here it
 * only pauses; the flow around it — sign in, then claim, then confirm — is the
 * real thing being built.
 */
export async function claimSession(sessionCode: string): Promise<void> {
  await wait();
  void sessionCode;
}
