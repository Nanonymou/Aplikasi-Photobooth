import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { requireAccount } from "@/lib/auth/page-guard";

/**
 * The settings section's frame.
 *
 * Everything under `/pengaturan` is about one person's own account, so the whole
 * subtree is gated to a signed-in one — on the server, before any of it renders.
 * No role is required: this is not a privileged area, it is where somebody
 * changes their own name.
 *
 * The column is narrower than the console's. These are forms and short lists
 * read one at a time, and a settings field stretched across a 1200px screen is
 * harder to read than one that stops at a comfortable measure.
 */
export default async function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAccount();

  return (
    <div className="bg-background flex min-h-dvh flex-col">
      <AppHeader title="Pengaturan" />
      <SettingsNav />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
