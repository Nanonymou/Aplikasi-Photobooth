import "server-only";

import { query, transaction } from "@/lib/db/client";

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
  avatar_key: string | null;
  role: UserRole;
  provider: AuthProvider;
  last_sign_in_at: Date | null;
}

/**
 * The picture to draw for this person.
 *
 * An uploaded one wins over the provider's, because it is the one they chose.
 * Both are kept (migration 0027) so removing the upload falls back to whatever
 * Google or Apple sent rather than to a blank circle.
 */
function avatarFor(row: UserProfileRow): string | null {
  if (row.avatar_key) return `/api/avatars/${row.avatar_key}`;
  return row.avatar_url;
}

function toProfile(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: avatarFor(row),
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

/**
 * Updates the parts of a profile its owner is allowed to change.
 *
 * `role` is conspicuously not among them, and not by omission: a profile update
 * that could set a role would be a privilege escalation reachable by anyone with
 * an account. Roles are granted through the admin surface, by someone who
 * already holds the permission to grant them.
 *
 * Passing `null` clears a field, while omitting it leaves the stored value
 * alone — the difference between "I removed my picture" and "I only renamed
 * myself", which a single optional argument cannot otherwise express.
 */
export async function updateOwnProfile(
  id: string,
  patch: {
    displayName?: string | null;
    avatarUrl?: string | null;
    /** Blob-store key of a picture they uploaded; `null` removes it. */
    avatarKey?: string | null;
  },
): Promise<UserProfile | null> {
  const rows = await query<UserProfileRow>(
    `update user_profiles set
       display_name = case when $2::boolean then $3 else display_name end,
       avatar_url   = case when $4::boolean then $5 else avatar_url end,
       avatar_key   = case when $6::boolean then $7 else avatar_key end
     where id = $1
     returning *`,
    [
      id,
      "displayName" in patch,
      patch.displayName ?? null,
      "avatarUrl" in patch,
      patch.avatarUrl ?? null,
      "avatarKey" in patch,
      patch.avatarKey ?? null,
    ],
  );

  return rows[0] ? toProfile(rows[0]) : null;
}

export interface UserListQuery {
  /** Matches name or email, case-insensitively. */
  search?: string;
  role?: UserRole;
  sort?: "name" | "joined";
  direction?: "asc" | "desc";
  limit: number;
  offset: number;
}

export interface UserListPage {
  users: (UserProfile & { createdAt: string })[];
  /** Total matching the filters, so the console can page and show a count. */
  total: number;
}

interface ListRow extends UserProfileRow {
  created_at: Date;
  total: string;
}

/**
 * Columns the caller may sort by.
 *
 * A whitelist, not a passthrough: the sort key reaches SQL as an identifier, and
 * an identifier cannot be a bound parameter. Mapping the caller's word to a
 * literal we wrote is what keeps `?sort=` from being an injection point.
 */
const SORT_COLUMNS = {
  name: "coalesce(display_name, email)",
  joined: "created_at",
} as const;

/**
 * The admin console's user list.
 *
 * Filters, sort, and the total come back in one round trip: a second query for
 * the count could disagree with the page it describes, and on a list people act
 * on — suspending, changing roles — that discrepancy is the kind users report as
 * "it said 40 but showed 39".
 */
export async function listUserProfiles(
  params: UserListQuery,
): Promise<UserListPage> {
  const column = SORT_COLUMNS[params.sort ?? "joined"];
  const direction = params.direction === "asc" ? "asc" : "desc";
  const search = params.search?.trim() ?? "";

  const rows = await query<ListRow>(
    `select *, count(*) over () as total
       from user_profiles
      where ($1::user_role is null or role = $1)
        and ($2 = '' or display_name ilike '%' || $2 || '%' or email ilike '%' || $2 || '%')
      order by ${column} ${direction}, id
      limit $3 offset $4`,
    [params.role ?? null, search, params.limit, params.offset],
  );

  return {
    users: rows.map((row) => ({
      ...toProfile(row),
      createdAt: row.created_at.toISOString(),
    })),
    // `count(*) over ()` is absent when nothing matched, which is itself zero.
    total: rows[0] ? Number(rows[0].total) : 0,
  };
}

export class LastAdminError extends Error {
  constructor() {
    super("Admin terakhir tidak bisa dicabut perannya.");
    this.name = "LastAdminError";
  }
}

/**
 * Changes someone's role.
 *
 * The guard that matters is the last admin: a console whose only administrator
 * demotes themselves — or is demoted by a colleague doing the same thing at the
 * same moment — cannot be recovered from inside the app. Somebody has to open a
 * database console, which on a booth deployment may mean nobody can.
 *
 * So the count and the write share a transaction, and the admin rows are locked
 * before counting. Two simultaneous demotions would otherwise both read "2
 * admins", both conclude they were safe, and between them leave zero.
 *
 * The admin set is locked *first*, and in id order, even when the target is not
 * an admin — that ordering is the whole point. Locking the target row first and
 * the admins second lets two demotions of two different admins grab each other's
 * rows in opposite orders, and Postgres resolves that by killing one with a
 * deadlock error: the right outcome (one change) reported as a server fault.
 * With one fixed order the second caller simply waits, then sees the truth.
 *
 * Serialising every role change behind one lock is affordable because role
 * changes are rare, deliberate, human-paced actions.
 *
 * Returns null when the target does not exist, so the caller can answer 404
 * rather than reporting a success that changed nothing.
 */
export async function changeUserRole(
  userId: string,
  role: UserRole,
  /** Who is doing it. Null when nothing with an account is — a script, a sweep. */
  actorId: string | null = null,
): Promise<UserProfile | null> {
  return transaction(async (client) => {
    const { rows: admins } = await client.query<{ id: string }>(
      "select id from user_profiles where role = 'admin' order by id for update",
    );

    const { rows: current } = await client.query<UserProfileRow>(
      "select * from user_profiles where id = $1 for update",
      [userId],
    );

    const target = current[0];
    if (!target) return null;
    if (target.role === role) return toProfile(target);

    if (target.role === "admin" && admins.length <= 1) {
      throw new LastAdminError();
    }

    const { rows: updated } = await client.query<UserProfileRow>(
      "update user_profiles set role = $2 where id = $1 returning *",
      [userId, role],
    );

    // In the same transaction as the change itself: a promotion that happened
    // without a line in the log, or a line without the promotion, would each be
    // worse than neither.
    await client.query(
      `insert into role_changes (subject_id, actor_id, from_role, to_role)
       values ($1, $2, $3, $4)`,
      [userId, actorId, target.role, role],
    );

    return toProfile(updated[0]);
  });
}

export interface RoleChange {
  from: UserRole;
  to: UserRole;
  actorId: string | null;
  at: string;
}

/**
 * How this account's role got to where it is, newest first.
 *
 * Bounded rather than complete: the console shows a history, not an archive,
 * and an account that has been promoted and demoted forty times has a story its
 * last few rows already tell.
 */
export async function roleHistory(
  userId: string,
  limit = 20,
): Promise<RoleChange[]> {
  const rows = await query<{
    from_role: UserRole;
    to_role: UserRole;
    actor_id: string | null;
    created_at: Date;
  }>(
    `select from_role, to_role, actor_id, created_at
       from role_changes
      where subject_id = $1
      order by created_at desc, id desc
      limit $2`,
    [userId, limit],
  );

  return rows.map((row) => ({
    from: row.from_role,
    to: row.to_role,
    actorId: row.actor_id,
    at: row.created_at.toISOString(),
  }));
}
