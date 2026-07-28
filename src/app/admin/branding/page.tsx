import type { Metadata } from "next";

import { BrandingForm } from "@/components/admin/branding-form";

export const metadata: Metadata = {
  title: "Branding Event — FrameStudio AI",
};

/**
 * The event-branding page.
 *
 * Where the booth gets the event's face — name, tagline, accent, exit PIN — the
 * same values the kiosk and live slideshow display. The chrome comes from the
 * admin layout; this page states the heading and hands the rest to the form,
 * which pairs the fields with a live preview.
 */
export default function AdminBrandingPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Branding event</h1>
        <p className="text-muted-foreground text-sm">
          Sesuaikan tampilan booth untuk acaramu — dipakai di kiosk dan slideshow.
        </p>
      </div>

      <BrandingForm />
    </div>
  );
}
