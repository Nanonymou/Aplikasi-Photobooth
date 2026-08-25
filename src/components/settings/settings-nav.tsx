"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, LifeBuoy, UserRound, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface Tab {
  href: string;
  label: string;
  icon: LucideIcon;
  /** One line saying what the tab is for; shown to screen readers and on hover. */
  hint: string;
}

/**
 * The three things a signed-in person comes here to do.
 *
 * Not an exhaustive settings tree: this is a personal account, not a console.
 * Anything that belongs to the whole installation lives in `/admin/pengaturan`,
 * and putting it here too would give every knob two homes and eventually two
 * answers.
 */
const TABS: Tab[] = [
  {
    href: "/pengaturan/profil",
    label: "Profil",
    icon: UserRound,
    hint: "Nama, foto, dan alamat email akunmu",
  },
  {
    href: "/pengaturan/langganan",
    label: "Langganan",
    icon: CreditCard,
    hint: "Paket yang kamu pakai dan pemakaiannya",
  },
  {
    href: "/pengaturan/bantuan",
    label: "Bantuan",
    icon: LifeBuoy,
    hint: "Panduan, pertanyaan umum, dan cara menghubungi kami",
  },
];

/**
 * The settings section's tab row.
 *
 * Routes rather than client-side panels, so a tab is a place: it can be linked
 * to, opened in a new tab, and comes back after a reload. Marking the current
 * one needs the path, which is the only reason this half is a client component
 * while the frame around it is not.
 *
 * Scrolls sideways instead of wrapping — three tabs fit on any phone, but the
 * row should not start stacking the day a fourth arrives.
 */
export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Bagian pengaturan"
      className="bg-card border-border sticky top-14 z-10 border-b"
    >
      <div className="mx-auto flex w-full max-w-3xl gap-1 overflow-x-auto px-2">
        {TABS.map(({ href, label, icon: Icon, hint }) => {
          const active = pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              title={hint}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm whitespace-nowrap transition-colors",
                active
                  ? "border-primary text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground border-transparent",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
