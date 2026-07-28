import type { Metadata } from "next";

import { EditorShell } from "@/components/editor/editor-shell";
import { GuestSessionBanner } from "@/components/session/guest-session-banner";
import { SaveToAccountButton } from "@/components/session/save-to-account";

export const metadata: Metadata = {
  title: "Sesi tamu — FrameStudio AI",
  description:
    "Buat dan sunting frame foto tanpa akun. Karyamu tersimpan di perangkat ini.",
};

/**
 * The anonymous guest's editor.
 *
 * Same editor as `/editor`, framed as a session: a guest arrives without an
 * account, gets a device-local session, and edits straight away. The only thing
 * this route adds over the bare editor is the session strip that tells them
 * where their work lives — everything else is the shared `EditorShell`, so the
 * two never drift apart.
 */
export default function GuestSessionPage() {
  return (
    <EditorShell
      sessionBanner={<GuestSessionBanner />}
      topbarActions={<SaveToAccountButton />}
    />
  );
}
