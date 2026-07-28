import type { Metadata } from "next";

import { RoleGuard } from "@/components/auth/role-guard";
import { Subscription } from "@/components/billing/subscription";
import { AppHeader } from "@/components/layout/app-header";

export const metadata: Metadata = {
  title: "Langganan — FrameStudio AI",
};

/**
 * A regular user's subscription page.
 *
 * Where an account holder manages their plan — gated to any signed-in account, a
 * signed-out visitor is sent to log in. The header and account menu tie it into
 * the rest of the signed-in app; the plans and upgrade flow are below.
 */
export default function SubscriptionPage() {
  return (
    <RoleGuard allow={["admin", "editor", "operator", "tamu"]}>
      <div className="bg-background flex min-h-dvh flex-col">
        <AppHeader title="Langganan" />

        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight">Langganan</h1>
            <p className="text-muted-foreground text-sm">
              Pilih paket yang pas dengan cara kamu berkarya.
            </p>
          </div>

          <Subscription />
        </main>
      </div>
    </RoleGuard>
  );
}
