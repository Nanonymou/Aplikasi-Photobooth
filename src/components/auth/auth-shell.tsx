import Link from "next/link";
import type { ReactNode } from "react";
import { Aperture } from "lucide-react";

/**
 * The frame both auth screens share.
 *
 * Login and register are the same shape — brand mark, a heading, the form, and
 * a line pointing at the other screen — so the layout lives here and each page
 * supplies only what differs. Keeping them identical is the point: an auth pair
 * that drifts looks broken.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link
          href="/"
          className="focus-visible:ring-ring/50 mx-auto flex items-center gap-2 rounded-md outline-none focus-visible:ring-[3px]"
        >
          <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl">
            <Aperture className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            FrameStudio
          </span>
        </Link>

        <div className="flex flex-col gap-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground text-sm text-pretty">{subtitle}</p>
        </div>

        <div className="border-editor-border bg-editor-surface flex flex-col gap-4 rounded-xl border p-5">
          {children}
        </div>

        <p className="text-muted-foreground text-center text-sm">{footer}</p>
      </div>
    </main>
  );
}
