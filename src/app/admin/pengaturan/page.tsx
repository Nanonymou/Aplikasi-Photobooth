import type { Metadata } from "next";

import { SettingsForm } from "@/components/admin/settings-form";

export const metadata: Metadata = {
  title: "Pengaturan Sistem — FrameStudio AI",
};

/**
 * The system-settings page.
 *
 * The booth-wide knobs — brand, guest sessions, export defaults, security —
 * grouped by concern and committed together. The chrome comes from the admin
 * layout; this page states the heading and hands the form the mock defaults.
 */
export default function AdminSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Pengaturan sistem</h1>
        <p className="text-muted-foreground text-sm">
          Atur perilaku FrameStudio untuk seluruh pengguna.
        </p>
      </div>

      <SettingsForm />
    </div>
  );
}
