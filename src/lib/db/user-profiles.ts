import "server-only";

import { query } from "@/lib/db/client";

/**
 * Account profiles, kept in step with whatever the identity provider says.
 *
 * A provider is the authority on who someone is — their name, their picture,
 * the email they verified — and it can change between sign-ins. It is emphatically
 * *not* the authority on what they may do here: that is `role`, granted inside
 * this app, and nothing a provider sends may touch it.
 */

export type UserRole = "admin" | "editor" | "operator" | "tamu";
export type AuthProvider = "email" | "google" | "apple";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  provider: AuthProvider;
  lastSignInAt: string | null;
}

interface UserProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  provider: AuthProvider;
  last_sign_in_at: Date | null;
}

function toProfile(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    provider: row.provider,
    lastSignInAt: row.last_sign_in_at?.toISOString() ?? null,
  };
}

export interface ProfileInput {
  id: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  provider: AuthProvider;
}

/**
 * Records a sign-in, creating the profile if this is the first one.
 *
 * Three rules are encoded in the update, and each one is a bug someone has
 * shipped before:
 *
 * 1. `role` is never touched. Signing in with Google must not demote an admin
 *    back to the default — the provider has no opinion about roles and must not
 *    be able to express one.
 * 2. A name or avatar is only overwritten when the provider actually sent one.
 *    Apple returns a name on the *first* authorisation only, so a second sign-in
 *    carries nulls that would otherwise wipe what the first one stored.
 * 3. `email` is lowercased here as well as checked by the column, because the
 *    caller is the likelier source of a stray capital than the database is.
 */
export async function recordSignIn(input: ProfileInput): Promise<UserProfile> {
  const rows = await query<UserProfileRow>(
    `insert into user_profiles (id, email, display_name, avatar_url, provider, last_sign_in_at)
     values ($1, lower($2), $3, $4, $5, now())
     on conflict (id) do update set
       email = lower($2),
       display_name = coalesce($3, user_profiles.display_name),
       avatar_url = coalesce($4, user_profiles.avatar_url),
       provider = $5,
       last_sign_in_at = now()
     returning *`,
    [
      input.id,
      input.email,
      input.displayName ?? null,
      input.avatarUrl ?? null,
      input.provider,
    ],
  );

  return toProfile(rows[0]);
}

export async function getUserProfile(id: string): Promise<UserProfile | null> {
  const rows = await query<UserProfileRow>(
    "select * from user_profiles where id = $1",
    [id],
  );
  return rows[0] ? toProfile(rows[0]) : null;
}
