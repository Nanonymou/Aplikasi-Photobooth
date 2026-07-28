import type { Metadata } from "next";

import { RoleGuard } from "@/components/auth/role-guard";
import { LiveSlideshow } from "@/components/slideshow/live-slideshow";

export const metadata: Metadata = {
  title: "Live Slideshow — FrameStudio AI",
};

/**
 * Live slideshow, for the organizer running a booth.
 *
 * The big-screen display of an event's shared photos — an operator or admin puts
 * it up, a guest never opens it directly — so it is gated to those roles. The
 * slideshow itself is everything below.
 */
export default function SlideshowPage() {
  return (
    <RoleGuard allow={["operator", "admin"]}>
      <LiveSlideshow />
    </RoleGuard>
  );
}
