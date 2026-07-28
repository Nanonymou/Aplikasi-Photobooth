import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin/admin-nav";
import { AdminTopbar } from "@/components/admin/admin-topbar";

/**
 * The admin console frame.
 *
 * Every admin page sits inside the same chrome — top bar, section nav, a
 * width-capped content column — so they read as one console rather than a set of
 * stray pages. Individual pages supply only their content and manage their own
 * internal spacing; the guard that keeps non-admins out of this whole subtree is
 * a later RBAC task and will live here.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background flex min-h-dvh flex-col">
      <AdminTopbar />
      <AdminNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
