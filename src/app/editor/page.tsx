import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { EditorShell } from "@/components/editor/editor-shell";
import { Button } from "@/components/ui/button";
import { requireAccount } from "@/lib/auth/page-guard";

export const metadata: Metadata = {
  title: "Editor — FrameStudio AI",
};

/**
 * The signed-in user's design surface.
 *
 * Where an account holder actually builds a frame — the destination of "open" and
 * "new" from the gallery, and where login lands. Gated to any signed-in account
 * (a signed-out visitor is sent to log in; a guest has the ungated `/tamu`
 * instead), and framed with a way back to the gallery so the design loop —
 * gallery → editor → gallery — closes. The account menu (sign out, admin console
 * for admins) rides in the shell's top bar.
 */
export default async function EditorPage() {
  await requireAccount();

  return (
    <EditorShell
      topbarActions={
        <Button asChild variant="ghost" size="sm">
          <Link href="/galeri">
            <ArrowLeft />
            <span className="hidden sm:inline">Galeri</span>
          </Link>
        </Button>
      }
    />
  );
}
