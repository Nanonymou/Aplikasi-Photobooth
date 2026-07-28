"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match the path exactly (the dashboard root) rather than by prefix. */
  exact?: boolean;
}

/** Console sections. Later RBAC tasks append their pages here. */
const ITEMS: NavItem[] = [
  { href: "/admin", label: "Dasbor", icon: LayoutDashboard, exact: true },
  { href: "/admin/pengguna", label: "Pengguna", icon: Users },
];

/**
 * The console's section nav.
 *
 * A thin tab row under the top bar, one link per admin area, the current one
 * underlined. Kept separate from the (server-rendered) top bar because marking
 * the active tab needs the current path — the one client concern here — and the
 * row scrolls sideways on narrow screens rather than wrapping.
 */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-card border-border sticky top-14 z-10 border-b">
      <div className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-2">
        {ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
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
