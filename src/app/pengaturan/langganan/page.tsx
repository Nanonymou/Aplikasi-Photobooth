import type { Metadata } from "next";

import { PlanComparison } from "@/components/settings/plan-comparison";
import { SectionHeading } from "@/components/settings/section-heading";
import { SubscriptionStatus } from "@/components/settings/subscription-status";
import { UpgradeOffer } from "@/components/settings/upgrade-offer";

export const metadata: Metadata = {
  title: "Langganan — FrameStudio AI",
};

/**
 * The subscription tab.
 *
 * Where somebody checks what they are on and how much of it they have used.
 * Choosing a different plan stays on `/langganan`, which is the pricing screen
 * with its own billing-cycle switch — this tab is the account's side of that
 * story, and links across rather than growing a second copy of it.
 */
export default function SubscriptionSettingsPage() {
  return (
    <>
      <SectionHeading
        title="Langganan"
        description="Paket yang sedang kamu pakai, dan seberapa banyak yang sudah terpakai."
      />

      <SubscriptionStatus />
      <UpgradeOffer />
      <PlanComparison />
    </>
  );
}
