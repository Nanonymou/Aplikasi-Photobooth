import type { Metadata } from "next";

import { ContentLibrary } from "@/components/admin/content-library";

export const metadata: Metadata = {
  title: "Manajemen Konten — FrameStudio AI",
};

/**
 * The content-management page.
 *
 * The console's pustaka: templates and the assets that dress them, searchable and
 * filterable by kind, with per-card actions the later RBAC tasks fill in. The
 * chrome comes from the admin layout; this page states the heading and hands the
 * library to the client grid.
 */
export default function AdminContentPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Konten</h1>
        <p className="text-muted-foreground text-sm">
          Kelola template dan aset pustaka yang dipakai di editor.
        </p>
      </div>

      <ContentLibrary />
    </div>
  );
}
