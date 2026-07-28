import type { Metadata } from "next";

import { RoleGuard } from "@/components/auth/role-guard";
import { KioskMode } from "@/components/kiosk/kiosk-mode";

export const metadata: Metadata = {
  title: "Kiosk Mode — FrameStudio AI",
};

/**
 * Kiosk mode, for the organizer running a booth.
 *
 * Running an unattended booth is the operator's job, so the page is gated to the
 * roles that hold one — an operator or an admin sets it up, a guest never reaches
 * it directly. Everything else is the kiosk itself.
 */
export default function KioskPage() {
  return (
    <RoleGuard allow={["operator", "admin"]}>
      <KioskMode />
    </RoleGuard>
  );
}
