import type { Metadata } from "next";

import { EditorShell } from "@/components/editor/editor-shell";
import { EndSessionButton } from "@/components/session/end-session";
import { GuestSessionBanner } from "@/components/session/guest-session-banner";
import { RemixCreditBanner } from "@/components/session/remix-credit";
import { SaveToAccountButton } from "@/components/session/save-to-account";
import { showcaseItem } from "@/lib/showcase/feed";

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
 *
 * `?remix=<id>` names a published design this session was started from. It is
 * resolved here, on the server, so an id nobody published produces no credit
 * rather than a banner crediting a design that does not exist — this is a URL
 * strangers can edit.
 */
export default async function GuestSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const remix = (await searchParams).remix;
  const source = showcaseItem(typeof remix === "string" ? remix : "");
  const credit = source
    ? { id: source.id, title: source.title, author: source.author }
    : null;

  return (
    <EditorShell
      showAccount={false}
      sessionBanner={
        <>
          <GuestSessionBanner />
          <RemixCreditBanner arriving={credit} />
        </>
      }
      topbarActions={
        <>
          <EndSessionButton />
          <SaveToAccountButton />
        </>
      }
    />
  );
}
