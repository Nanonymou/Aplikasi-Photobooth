import Link from "next/link";
import { Aperture } from "lucide-react";

import { AccountMenu } from "@/components/auth/account-menu";
import { Separator } from "@/components/ui/separator";

/**
 * The top bar for a signed-in user's own pages.
 *
 * The gallery, subscription, and their siblings share one thin bar — brand home,
 * the section's name, and the account menu — so they read as one signed-in app
 * rather than a set of loose pages. Non-console pages that live outside the admin
 * layout use this instead of hand-rolling the same header each time.
 */
export function AppHeader({ title }: { title: string }) {
  return (
    <header className="bg-card border-border flex h-14 shrink-0 items-center gap-3 border-b px-4">
      <Link
        href="/"
        className="focus-visible:ring-ring/50 flex items-center gap-2 rounded-md outline-none focus-visible:ring-[3px]"
      >
        <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
          <Aperture className="size-4.5" />
        </span>
        <span className="hidden text-sm font-semibold tracking-tight sm:inline">
          FrameStudio
        </span>
      </Link>
      <Separator orientation="vertical" className="h-6" />
      <span className="text-muted-foreground text-sm font-medium">{title}</span>
      <div className="ml-auto">
        <AccountMenu />
      </div>
    </header>
  );
}
