import type { Metadata } from "next";
import { LifeBuoy } from "lucide-react";

import { SectionHeading } from "@/components/settings/section-heading";
import { SectionPlaceholder } from "@/components/settings/section-placeholder";

export const metadata: Metadata = {
  title: "Bantuan — FrameStudio AI",
};

/**
 * The help tab.
 *
 * Inside settings rather than off in its own corner of the app, because the
 * moment somebody needs help is usually the moment they are already looking at
 * their account and something has not gone the way they expected.
 */
export default function HelpSettingsPage() {
  return (
    <>
      <SectionHeading
        title="Bantuan"
        description="Panduan singkat, pertanyaan yang sering muncul, dan cara menghubungi kami."
      />

      <SectionPlaceholder icon={LifeBuoy}>
        Pusat bantuan beserta daftar artikelnya menyusul di tugas berikutnya.
      </SectionPlaceholder>
    </>
  );
}
