"use client";

import Link from "next/link";
import {
  CreditCard,
  Images,
  LifeBuoy,
  LogOut,
  MonitorPlay,
  Projector,
  ShieldCheck,
  Settings,
  TrendingUp,
} from "lucide-react";

import { RoleGate } from "@/components/auth/role-gate";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/auth/avatar";
import { ROLE_LABELS, ROLES } from "@/lib/auth/roles";
import { setMockRole, useAccount } from "@/lib/auth/use-account";
import { useLogout } from "@/lib/auth/use-logout";
import { cn } from "@/lib/utils";

/**
 * The signed-in user's account menu.
 *
 * The one place the workspace names who you are: an avatar in the top bar that
 * opens to your profile — name, email, the same avatar larger — over the actions
 * that belong to an account. Signing out is the only wired action for now; the
 * rest wait on their features, so they are absent rather than dead. Rendered only
 * where there is an account, so the guest editor never shows a stranger's face.
 */
export function AccountMenu() {
  const profile = useAccount();
  const { signOut, busy } = useLogout();

  // Neutral placeholder during the server render / first paint, matching the
  // avatar's footprint so the top bar does not shift when the profile arrives.
  if (!profile) {
    return <span className="bg-muted size-8 shrink-0 rounded-full" aria-hidden />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-full"
          aria-label="Menu akun"
        >
          <Avatar profile={profile} className="size-7 text-[11px]" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <Avatar profile={profile} className="size-9 text-xs" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{profile.name}</p>
            <p className="text-muted-foreground truncate text-xs">
              {profile.email}
            </p>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Destinations appear by role: the console for admins, the booth
            surfaces for whoever runs an event. RoleGate hides what you cannot
            reach, so the menu is the live shape of your access. */}
        <RoleGate allow={["admin"]}>
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <ShieldCheck />
              Konsol admin
            </Link>
          </DropdownMenuItem>
        </RoleGate>
        <RoleGate allow={["operator", "admin"]}>
          <DropdownMenuItem asChild>
            <Link href="/kiosk">
              <Projector />
              Mode kiosk
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/slideshow">
              <MonitorPlay />
              Live slideshow
            </Link>
          </DropdownMenuItem>
        </RoleGate>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/galeri">
            <Images />
            Galeri saya
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/kreator">
            <TrendingUp />
            Dasbor kreator
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/langganan">
            <CreditCard />
            Langganan
          </Link>
        </DropdownMenuItem>

        {/* One entry, not two: "profil" and "pengaturan akun" were the same
            destination wearing different names, and the section they lead to
            keeps its own tabs. */}
        <DropdownMenuItem asChild>
          <Link href="/pengaturan/profil">
            <Settings />
            Pengaturan
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/pengaturan/bantuan">
            <LifeBuoy />
            Bantuan
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Frontend demo: flip the mock account's role and watch the entries
            above appear and disappear. The real role comes from the server. */}
        <div className="px-2 py-1.5">
          <p className="text-muted-foreground mb-1.5 text-[10px] font-medium tracking-wide uppercase">
            Lihat sebagai · demo
          </p>
          <div className="flex flex-wrap gap-1">
            {ROLES.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setMockRole(role)}
                aria-pressed={profile.role === role}
                className={cn(
                  "rounded-md border px-2 py-1 text-xs transition-colors",
                  profile.role === role
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:bg-accent",
                )}
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          disabled={busy}
          onSelect={(event) => {
            // Keep the menu's default close from racing the async navigation.
            event.preventDefault();
            void signOut();
          }}
        >
          <LogOut />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
