/**
 * Admin dashboard data.
 *
 * The frontend is built before the backend, so the dashboard reads a shaped
 * stand-in for `GET /api/admin/overview` rather than waiting on it: the same
 * fields the real endpoint will return — headline metrics, a role breakdown, and
 * a recent-activity feed. Kept as a plain module (no hooks) so a server component
 * can render it directly; when the endpoint lands it replaces these constants and
 * the components do not move.
 */

export type Trend = "up" | "down" | "flat";

export interface AdminStat {
  id: "users" | "designs" | "photos" | "storage";
  label: string;
  value: string;
  /** Change over the previous period, already formatted; omitted if not shown. */
  delta?: string;
  trend?: Trend;
  /** Human note under the number, e.g. the comparison window. */
  note?: string;
}

export const ADMIN_STATS: AdminStat[] = [
  {
    id: "users",
    label: "Total pengguna",
    value: "1.284",
    delta: "+8,2%",
    trend: "up",
    note: "vs 30 hari lalu",
  },
  {
    id: "designs",
    label: "Desain dibuat",
    value: "5.130",
    delta: "+12%",
    trend: "up",
    note: "vs 30 hari lalu",
  },
  {
    id: "photos",
    label: "Foto diambil",
    value: "38.902",
    delta: "+3,1%",
    trend: "up",
    note: "vs 30 hari lalu",
  },
  {
    id: "storage",
    label: "Penyimpanan terpakai",
    value: "62%",
    note: "310 GB dari 500 GB",
    trend: "flat",
  },
];

export interface RoleCount {
  /** Machine id, matching the role a later RBAC task will assign. */
  id: string;
  label: string;
  count: number;
}

/** Ordered most-privileged first, so the table reads as a hierarchy. */
export const ROLE_COUNTS: RoleCount[] = [
  { id: "admin", label: "Admin", count: 4 },
  { id: "editor", label: "Editor", count: 37 },
  { id: "operator", label: "Operator", count: 112 },
  { id: "tamu", label: "Tamu", count: 1131 },
];

export interface ActivityItem {
  id: string;
  actor: string;
  /** What they did, phrased to read after the actor's name. */
  action: string;
  /** Relative time, pre-formatted so there is no clock to hydrate. */
  at: string;
}

export const RECENT_ACTIVITY: ActivityItem[] = [
  {
    id: "a1",
    actor: "Dewi Anggraini",
    action: "menerbitkan template “Lebaran 2026”",
    at: "5 menit lalu",
  },
  {
    id: "a2",
    actor: "Admin",
    action: "memberi peran Editor kepada Sari Utami",
    at: "42 menit lalu",
  },
  {
    id: "a3",
    actor: "Operator Budi",
    action: "mengekspor 24 frame dari booth Bandung",
    at: "1 jam lalu",
  },
  {
    id: "a4",
    actor: "Rangga Pratama",
    action: "menambahkan 18 stiker ke pustaka",
    at: "3 jam lalu",
  },
  {
    id: "a5",
    actor: "Admin",
    action: "menonaktifkan akun operator lama",
    at: "kemarin",
  },
];
