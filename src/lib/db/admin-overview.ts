import "server-only";

import { query } from "@/lib/db/client";
import type { UserRole } from "@/lib/db/user-profiles";

/**
 * The admin console's summary, read once.
 *
 * Three panels, one function, because a dashboard that fetched each of them
 * separately would be describing three different moments as if they were one.
 * Shared by the console page, which renders it on the server, and by
 * `GET /api/admin/overview`, which serves it to anything that is not this app.
 */

export interface AdminCounts {
  users: number;
  designs: number;
  photos: number;
  activeGuestSessions: number;
}

export interface RoleChangeEntry {
  at: string;
  from: UserRole;
  to: UserRole;
  subject: string;
  /** Null when the change came from a script rather than a person. */
  actor: string | null;
}

export interface AdminOverviewData {
  counts: AdminCounts;
  roles: Partial<Record<UserRole, number>>;
  activity: RoleChangeEntry[];
}

interface CountsRow {
  users: string;
  designs: string;
  photos: string;
  guest_sessions: string;
}

interface RoleChangeRow {
  created_at: Date;
  from_role: UserRole;
  to_role: UserRole;
  subject_email: string;
  subject_name: string | null;
  actor_email: string | null;
  actor_name: string | null;
}

/** A name for a console row: what they chose, else the part before the @. */
function displayFor(name: string | null, email: string): string {
  return name?.trim() || email.split("@")[0];
}

/** How many changes the feed shows. A dashboard is a glance, not an audit log. */
const ACTIVITY_LIMIT = 8;

export async function readOverview(): Promise<AdminOverviewData> {
  const [counts, roles, activity] = await Promise.all([
    query<CountsRow>(`
      select
        (select count(*) from user_profiles) as users,
        (select count(*) from designs where deleted_at is null) as designs,
        (select count(*) from photos where deleted_at is null) as photos,
        (select count(*) from guest_sessions
          where claimed_at is null and expires_at > now()) as guest_sessions
    `),
    query<{ role: UserRole; total: string }>(
      "select role, count(*) as total from user_profiles group by role",
    ),
    // The only activity trail this installation actually keeps. A console
    // listing invented events would read better and be worth less than nothing.
    query<RoleChangeRow>(
      `select c.created_at, c.from_role, c.to_role,
              subject.email as subject_email,
              subject.display_name as subject_name,
              actor.email as actor_email,
              actor.display_name as actor_name
         from role_changes c
         join user_profiles subject on subject.id = c.subject_id
         left join user_profiles actor on actor.id = c.actor_id
        order by c.created_at desc, c.id desc
        limit $1`,
      [ACTIVITY_LIMIT],
    ),
  ]);

  const row = counts[0];

  return {
    counts: {
      users: Number(row.users),
      designs: Number(row.designs),
      photos: Number(row.photos),
      activeGuestSessions: Number(row.guest_sessions),
    },
    roles: Object.fromEntries(
      roles.map((entry) => [entry.role, Number(entry.total)]),
    ) as Partial<Record<UserRole, number>>,
    activity: activity.map((entry) => ({
      at: entry.created_at.toISOString(),
      from: entry.from_role,
      to: entry.to_role,
      subject: displayFor(entry.subject_name, entry.subject_email),
      actor: entry.actor_email
        ? displayFor(entry.actor_name, entry.actor_email)
        : null,
    })),
  };
}
