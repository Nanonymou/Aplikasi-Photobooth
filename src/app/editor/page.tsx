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
 *
 * `?desain=<id>` opens an existing one, which is how the gallery hands a card
 * over. Without it the canvas starts empty and the first edit creates the design
 * — the editor is where a design comes into being, not a file you name first.
 *
 * Read from the page's `searchParams` rather than through `useSearchParams` in
 * the shell: the guard already makes this route dynamic, and a param read on the
 * server does not push the whole editor behind a Suspense boundary.
 */
export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{ desain?: string | string[] }>;
}) {
  await requireAccount();

  const { desain } = await searchParams;
  const designId = Array.isArray(desain) ? desain[0] : (desain ?? null);

  return (
    <EditorShell
      designId={designId}
      remote
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
