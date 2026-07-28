import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin/admin-nav";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { RoleGuard } from "@/components/auth/role-guard";

/**
 * The admin console frame.
 *
 * Every admin page sits inside the same chrome — top bar, section nav, a
 * width-capped content column — so they read as one console rather than a set of
 * stray pages. The whole subtree is gated: only an admin gets the console at all,
 * so the guard wraps the chrome, not just the content, and a blocked user sees
 * the denial instead of an empty shell.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard allow={["admin"]}>
      <div className="bg-background flex min-h-dvh flex-col">
        <AdminTopbar />
        <AdminNav />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
          {children}
        </main>
      </div>
    </RoleGuard>
  );
}
