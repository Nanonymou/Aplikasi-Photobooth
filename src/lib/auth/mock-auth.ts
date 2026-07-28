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
