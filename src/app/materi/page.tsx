import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { MateriShell } from "@/components/materi/materi-shell";

export const metadata: Metadata = {
  title: "Materi Pelatihan — Training JSA & HIRADC",
  description:
    "Pelajari penyusunan dan pengisian JSA & HIRADC bab per bab, disajikan interaktif untuk Tim QHSE PT Tiga Persada Benua.",
};

/**
 * The Materi (training material) screen.
 *
 * Turns the JSA & HIRADC handbook into a browsable, chapter-based reader. The
 * page supplies the framing — brand row and a short intro — and hands the
 * chapter navigation and content to the shell, which manages the active chapter
 * on the client. Content is seed data for now; a later phase wires it to Postgres.
 */
export default function MateriPage() {
  return (
    <div className="bg-background flex min-h-dvh flex-col">
      <header className="bg-card border-border flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <Link
          href="/"
          className="focus-visible:ring-ring/50 flex items-center gap-2 rounded-md outline-none focus-visible:ring-[3px]"
        >
          <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
            <GraduationCap className="size-4.5" />
          </span>
          <span className="hidden text-sm font-semibold tracking-tight sm:inline">
            Training JSA &amp; HIRADC
          </span>
        </Link>
        <span className="text-muted-foreground text-sm font-medium">
          Materi Pelatihan
        </span>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <div className="mb-5 flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">
            Materi Pelatihan
          </h1>
          <p className="text-muted-foreground text-sm text-pretty">
            Penyusunan dan Pengisian JSA &amp; HIRADC — pilih bab di samping
            untuk mulai belajar.
          </p>
        </div>

        <MateriShell />
      </main>
    </div>
  );
}
