import type { Metadata } from "next";

import { KioskMode } from "@/components/kiosk/kiosk-mode";
import { requirePageFeature } from "@/lib/auth/page-guard";
import { getKioskConfig } from "@/lib/db/event-branding";
import type { KioskScreenConfig } from "@/lib/kiosk/kiosk-config";

export const metadata: Metadata = {
  title: "Kiosk Mode — FrameStudio AI",
};

/**
 * Kiosk mode, for the organizer running a booth.
 *
 * Running an unattended booth is the operator's job, and kiosk mode is sold with
 * the Studio plan, so the gate asks both at once — the same feature check the
 * endpoints behind this screen use. A role that will never fit lands on the
 * denial page; an account one upgrade away lands on the pricing page, which is
 * the only one of the two that is worth showing them.
 *
 * The booth's copy is read here and handed down, so the welcome screen is right
 * on its first paint — a booth that flashes a placeholder event name at the
 * first guest of the evening has already got the one thing wrong that everybody
 * in the room can check.
 */
export default async function KioskPage() {
  await requirePageFeature("booth.kiosk");

  const stored = await getKioskConfig();
  // Narrowed on purpose: the accent, the audit columns, and anything else that
  // grows on the row stay on this side of the boundary.
  const config: KioskScreenConfig = {
    eventName: stored.eventName,
    tagline: stored.tagline,
    brandName: stored.brandName,
    pinSet: stored.pinSet,
  };

  return <KioskMode config={config} />;
}
