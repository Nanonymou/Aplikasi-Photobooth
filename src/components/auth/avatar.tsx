"use client";

import { initials } from "@/lib/auth/initials";
import type { Profile } from "@/lib/auth/use-account";
import { cn } from "@/lib/utils";

/**
 * Somebody's face, or the next best thing.
 *
 * A provider avatar when there is one, initials when there is not — never an
 * empty circle, because a blank where a face belongs reads as something failing
 * to load rather than as an account without a photo.
 *
 * Lives on its own so the top bar and the profile form show the same face at two
 * sizes; a second copy is how they start disagreeing about the fallback.
 */
export function Avatar({
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
