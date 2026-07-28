import type { Metadata } from "next";

import { UserManagement } from "@/components/admin/user-management";

export const metadata: Metadata = {
  title: "Manajemen Pengguna — FrameStudio AI",
};

/**
 * The user-management page.
 *
 * The console's people list: every account, searchable and filterable by role,
 * with per-row actions the later RBAC tasks fill in. The chrome comes from the
 * admin layout; this page states the heading and hands the working list to the
 * client table.
 */
export default function AdminUsersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Pengguna</h1>
        <p className="text-muted-foreground text-sm">
          Kelola akun dan peran yang mengatur aksesnya.
        </p>
      </div>

      <UserManagement />
    </div>
  );
}
