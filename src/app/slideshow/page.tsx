import type { Metadata } from "next";

import { LiveSlideshow } from "@/components/slideshow/live-slideshow";
import { requirePageFeature } from "@/lib/auth/page-guard";
import { getBranding } from "@/lib/db/event-branding";

export const metadata: Metadata = {
  title: "Live Slideshow — FrameStudio AI",
};

/**
 * Live slideshow, for the organizer running a booth.
 *
 * The big-screen display of an event's shared photos — an operator or admin puts
 * it up, a guest never opens it directly — and, like kiosk mode, it is part of
 * the Studio plan. One feature check covers both halves, on the server, before
 * the screen exists.
 *
 * The event's name is read here for the same reason the kiosk reads it: the
 * badge over a wall display names the event to a room full of people who know
 * perfectly well what it is called.
 */
export default async function SlideshowPage() {
  await requirePageFeature("booth.slideshow");

  const branding = await getBranding();

  return <LiveSlideshow eventName={branding.eventName} />;
}
