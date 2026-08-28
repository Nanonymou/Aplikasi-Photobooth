"use client";

import { ROLE_LABELS, type Role } from "@/lib/auth/roles";

/**
 * The people with accounts, as the console reads and changes them.
 *
 * `GET /api/admin/users` does the searching, filtering and ordering, because
 * only it can see past the page it returned — filtering an arrived page here is
 * how a search box starts missing accounts that sit one page further down.
 *
 * There is no "status" here, and that is not an omission. The console used to
 * show Aktif / Diundang / Ditangguhkan against every row; nothing stores any of
 * those, no endpoint sets them, and a suspended account could still sign in.
 * What the schema does keep is when somebody last signed in, which answers the
 * question the status badge was pretending to.
 */

export type RoleId = Role;
export { ROLE_LABELS };

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: RoleId;
  provider: string;
  /** ISO; the table formats it. */
  joinedAt: string;
  lastSignInAt: string | null;
}

export interface UserPage {
  users: AdminUser[];
  /** Everyone matching the filter, not just this page. */
  total: number;
}

export type SortKey = "name" | "role" | "joined";
export type SortDir = "asc" | "desc";

interface ApiUser {
  id: string;
  email: string;
  displayName: string | null;
  role: RoleId;
  provider: string;
  createdAt: string;
  lastSignInAt: string | null;
}

async function refusal(response: Response, fallback: string): Promise<string> {
  const payload: unknown = await response.json().catch(() => null);
  const data =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : {};
  return typeof data.error === "string" ? data.error : fallback;
}

export async function listUsers(filter: {
  search?: string;
  role?: RoleId | "all";
  sort?: SortKey;
  dir?: SortDir;
} = {}): Promise<UserPage> {
  const params = new URLSearchParams();
  if (filter.search?.trim()) params.set("q", filter.search.trim());
  if (filter.role && filter.role !== "all") params.set("role", filter.role);
  if (filter.sort) params.set("sort", filter.sort);
  if (filter.dir) params.set("dir", filter.dir);

  const query = params.toString();
  const response = await fetch(`/api/admin/users${query ? `?${query}` : ""}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(await refusal(response, "Daftar pengguna gagal dimuat."));
  }

  const data = (await response.json()) as { users: ApiUser[]; total: number };
  return {
    total: data.total,
    users: data.users.map((user) => ({
      id: user.id,
      // The part before the @ for anybody who never set a name — the console is
      // a list of people, and a column of raw addresses is hard to read down.
      name: user.displayName?.trim() || user.email.split("@")[0],
      email: user.email,
      role: user.role,
      provider: user.provider,
      joinedAt: user.createdAt,
      lastSignInAt: user.lastSignInAt,
    })),
  };
}

/**
 * Changes somebody's role.
 *
 * The server refuses to remove the last admin and says so; that refusal is
 * passed through rather than pre-empted here, because only the server can know
 * whether this is the last one at the moment the change lands.
 */
export async function changeRole(id: string, role: RoleId): Promise<void> {
  const response = await fetch(`/api/admin/users/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ role }),
  });
  if (!response.ok) {
    throw new Error(await refusal(response, "Peran gagal diubah."));
  }
}

/** A date as a person writes it. */
export function tanggal(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
