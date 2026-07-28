/**
 * Admin user directory.
 *
 * Stand-in for `GET /api/admin/users` — the fields the management table renders:
 * who the user is, the role that governs what they can do, whether the account is
 * live, and when they joined. Roles use the same ids as the dashboard's role
 * summary so the two never disagree. A plain data module; the real endpoint
 * replaces these constants without moving the table.
 */

/** The roles RBAC assigns, most privileged first. */
export type RoleId = "admin" | "editor" | "operator" | "tamu";

export const ROLE_LABELS: Record<RoleId, string> = {
  admin: "Admin",
  editor: "Editor",
  operator: "Operator",
  tamu: "Tamu",
};

export type UserStatus = "active" | "invited" | "suspended";

export const STATUS_LABELS: Record<UserStatus, string> = {
  active: "Aktif",
  invited: "Diundang",
  suspended: "Ditangguhkan",
};

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: RoleId;
  status: UserStatus;
  /** Pre-formatted join date, so there is no locale/clock to hydrate. */
  joined: string;
  /** ISO date for sorting; compares chronologically as plain text. */
  joinedAt: string;
}

export const ADMIN_USERS: AdminUser[] = [
  {
    id: "u1",
    name: "Rara Prawira",
    email: "rara@contoh.id",
    role: "admin",
    status: "active",
    joined: "2 Jan 2024",
    joinedAt: "2024-01-02",
  },
  {
    id: "u2",
    name: "Dewi Anggraini",
    email: "dewi@contoh.id",
    role: "editor",
    status: "active",
    joined: "18 Feb 2024",
    joinedAt: "2024-02-18",
  },
  {
    id: "u3",
    name: "Fajar Nugroho",
    email: "fajar@contoh.id",
    role: "editor",
    status: "active",
    joined: "30 Apr 2025",
    joinedAt: "2025-04-30",
  },
  {
    id: "u4",
    name: "Sari Utami",
    email: "sari@contoh.id",
    role: "editor",
    status: "invited",
    joined: "12 Jul 2026",
    joinedAt: "2026-07-12",
  },
  {
    id: "u5",
    name: "Budi Santoso",
    email: "budi@contoh.id",
    role: "operator",
    status: "active",
    joined: "3 Mar 2025",
    joinedAt: "2025-03-03",
  },
  {
    id: "u6",
    name: "Rangga Pratama",
    email: "rangga@contoh.id",
    role: "operator",
    status: "active",
    joined: "21 Nov 2024",
    joinedAt: "2024-11-21",
  },
  {
    id: "u7",
    name: "Intan Permata",
    email: "intan@contoh.id",
    role: "operator",
    status: "suspended",
    joined: "9 Sep 2024",
    joinedAt: "2024-09-09",
  },
  {
    id: "u8",
    name: "Agus Salim",
    email: "agus@contoh.id",
    role: "tamu",
    status: "active",
    joined: "1 Jul 2026",
    joinedAt: "2026-07-01",
  },
  {
    id: "u9",
    name: "Maya Sari",
    email: "maya@contoh.id",
    role: "tamu",
    status: "active",
    joined: "14 Jun 2026",
    joinedAt: "2026-06-14",
  },
];
