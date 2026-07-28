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
