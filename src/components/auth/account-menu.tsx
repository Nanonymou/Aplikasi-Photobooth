"use client";

import { LogOut, Settings, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials, useAccount, type Profile } from "@/lib/auth/use-account";
import { useLogout } from "@/lib/auth/use-logout";
import { cn } from "@/lib/utils";

function Avatar({
  profile,
  className,
}: {
  profile: Profile;
  className?: string;
}) {
  if (profile.avatarUrl) {
    // A remote provider avatar of unknown host; next/image adds nothing over a
    // plain, sized img here.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatarUrl}
        alt=""
        className={cn("rounded-full object-cover", className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "bg-primary/10 text-primary flex items-center justify-center rounded-full font-medium",
        className,
      )}
      aria-hidden="true"
    >
      {initials(profile.name)}
    </span>
  );
}

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

        <DropdownMenuItem disabled>
          <UserRound />
          Profil saya
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Settings />
          Pengaturan akun
        </DropdownMenuItem>

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
