import type { Metadata } from "next";

import { BrandingForm } from "@/components/admin/branding-form";
import { getBranding } from "@/lib/db/event-branding";
import { getUserProfile } from "@/lib/db/user-profiles";
import type { BrandingState } from "@/lib/admin/branding";

export const metadata: Metadata = {
  title: "Branding Event — FrameStudio AI",
};

/**
 * The event-branding page.
 *
 * Where the booth gets the event's face — name, tagline, accent, exit PIN — the
 * same row the kiosk and live slideshow read. The chrome comes from the admin
 * layout; this page reads the stored values and hands them to the form, which
 * pairs the fields with a live preview.
 *
 * Whoever saved last is resolved to a name here rather than in the form: two
 * screens edit this row — the console and the booth's own setup — so "diubah
 * oleh" is the line that keeps an admin and an organizer from each being sure
 * they had the last word. A missing profile is left as null rather than shown as
 * a raw id, which would answer nobody's question.
 */
export default async function AdminBrandingPage() {
  const branding = await getBranding();
  const editor = branding.updatedBy
    ? await getUserProfile(branding.updatedBy)
    : null;

  const initial: BrandingState = {
    eventName: branding.eventName,
    tagline: branding.tagline,
    accent: branding.accent,
    pinSet: branding.pinSet,
    updatedAt: branding.updatedAt,
    updatedBy: editor?.displayName ?? editor?.email ?? null,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Branding event</h1>
        <p className="text-muted-foreground text-sm">
          Sesuaikan tampilan booth untuk acaramu — dipakai di kiosk dan slideshow.
        </p>
      </div>

      <BrandingForm initial={initial} />
    </div>
  );
}
