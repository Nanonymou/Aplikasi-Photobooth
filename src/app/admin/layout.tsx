import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin/admin-nav";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { requirePagePermission } from "@/lib/auth/page-guard";

/**
 * The admin console frame.
 *
 * Every admin page sits inside the same chrome — top bar, section nav, a
 * width-capped content column — so they read as one console rather than a set of
 * stray pages. The whole subtree is gated, on the server, before any of it is
 * rendered: someone without the permission never receives the console's markup
 * at all, rather than receiving it and being asked not to look.
 *
 * Guarded by `admin.console` rather than by the role name, so a support role
 * that may read the console becomes a row in `role_permissions` and not an edit
 * here.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requirePagePermission("admin.console");

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
