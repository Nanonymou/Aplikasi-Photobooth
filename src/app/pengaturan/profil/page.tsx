import type { Metadata } from "next";

import { ProfileForm } from "@/components/settings/profile-form";
import { SectionHeading } from "@/components/settings/section-heading";

export const metadata: Metadata = {
  title: "Profil — FrameStudio AI",
};

/**
 * The profile tab.
 *
 * What other people see of you: display name, photo, and the address the account
 * is reached at.
 */
export default function ProfileSettingsPage() {
  return (
    <>
      <SectionHeading
        title="Profil"
        description="Nama dan foto yang muncul di karyamu, serta alamat email akunmu."
      />

      <ProfileForm />
    </>
  );
}
