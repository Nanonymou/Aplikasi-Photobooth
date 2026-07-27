"use client";

import { cn } from "@/lib/utils";

/**
 * Full-screen white burst that stands in for a flash.
 *
 * It covers the viewport rather than just the viewfinder because its job is to
 * actually light the subject — on a photobooth tablet the screen is the only
 * light source available.
 */
export function FlashOverlay({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-0 z-50 bg-white transition-opacity",
        active ? "opacity-95 duration-75" : "opacity-0 duration-300",
      )}
    />
  );
}
