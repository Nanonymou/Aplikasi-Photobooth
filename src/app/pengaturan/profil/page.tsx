import type { Metadata } from "next";
import { UserRound } from "lucide-react";

import { SectionHeading } from "@/components/settings/section-heading";
import { SectionPlaceholder } from "@/components/settings/section-placeholder";

export const metadata: Metadata = {
  title: "Profil — FrameStudio AI",
};

/**
 * The profile tab.
 *
 * What other people see of you: display name, photo, and the address the account
 * is reached at. The form itself is the next task; this is the tab it lands in.
 */
export default function ProfileSettingsPage() {
  return (
    <>
      <SectionHeading
        title="Profil"
        description="Nama dan foto yang muncul di karyamu, serta alamat email akunmu."
      />

      <SectionPlaceholder icon={UserRound}>
        Formulir profil menyusul di tugas berikutnya — nama tampilan, foto, dan
        alamat email akan disunting dari sini.
      </SectionPlaceholder>
    </>
  );
}
