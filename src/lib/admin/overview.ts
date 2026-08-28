import type { AdminOverviewData } from "@/lib/db/admin-overview";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/auth/roles";

/**
 * The console's summary, in the shapes its three panels render.
 *
 * The reading is `readOverview`'s; this is only the presentation of it — labels,
 * number formatting, and the sentence a role change is phrased as. Kept apart so
 * the panels take plain props and the page can render them on the server.
 */

export type Trend = "up" | "down" | "flat";

export interface AdminStat {
  id: "users" | "designs" | "photos" | "guests";
  label: string;
  value: string;
  /** Human note under the number. */
  note?: string;
  trend?: Trend;
}

export interface RoleCount {
  id: Role;
  label: string;
  count: number;
}

export interface ActivityItem {
  id: string;
  actor: string;
  /** What they did, phrased to read after the actor's name. */
  action: string;
  at: string;
}

export interface AdminOverview {
  stats: AdminStat[];
  roles: RoleCount[];
  activity: ActivityItem[];
}

const angka = new Intl.NumberFormat("id-ID");

export function presentOverview(api: AdminOverviewData): AdminOverview {
  return {
    // No deltas. The endpoint reports what is there now, not what it was a
    // month ago, and "+8,2% vs 30 hari lalu" printed beside a number nobody
    // compared is the sort of figure that gets quoted in a meeting.
    stats: [
      {
        id: "users",
        label: "Total pengguna",
        value: angka.format(api.counts.users),
      },
      {
        id: "designs",
        label: "Desain dibuat",
        value: angka.format(api.counts.designs),
        note: "Belum dihapus pemiliknya",
      },
      {
        id: "photos",
        label: "Foto tersimpan",
        value: angka.format(api.counts.photos),
        note: "Terhapus otomatis sesuai retensi",
      },
      {
        id: "guests",
        label: "Sesi tamu aktif",
        value: angka.format(api.counts.activeGuestSessions),
        note: "Belum diklaim ke akun",
      },
    ],
    // Every role listed, including the ones nobody holds: a breakdown that
    // omits the empty rows is a breakdown you cannot read a zero off.
    roles: ROLES.map((role) => ({
      id: role,
      label: ROLE_LABELS[role],
      count: api.roles[role] ?? 0,
    })),
    activity: api.activity.map((entry) => ({
      id: `${entry.at}-${entry.subject}`,
      actor: entry.actor ?? "Sistem",
      action: `mengubah peran ${entry.subject} dari ${ROLE_LABELS[entry.from]} ke ${ROLE_LABELS[entry.to]}`,
      at: entry.at,
    })),
  };
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Relative time, on the client, where the reader's clock is. */
export function relativeTime(iso: string): string {
  const elapsed = Date.now() - new Date(iso).getTime();
  if (elapsed < MINUTE) return "baru saja";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} menit lalu`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)} jam lalu`;
  if (elapsed < 2 * DAY) return "kemarin";
  return `${Math.floor(elapsed / DAY)} hari lalu`;
}
