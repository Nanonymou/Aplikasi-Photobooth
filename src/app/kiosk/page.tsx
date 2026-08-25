import type { Metadata } from "next";

import { KioskMode } from "@/components/kiosk/kiosk-mode";
import { requirePageFeature } from "@/lib/auth/page-guard";

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
 */
export default async function KioskPage() {
  await requirePageFeature("booth.kiosk");

  return <KioskMode />;
}
