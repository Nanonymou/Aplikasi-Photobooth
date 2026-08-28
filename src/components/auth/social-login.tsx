"use client";

import { AppleIcon, GoogleIcon } from "@/components/auth/provider-icons";
import { Button } from "@/components/ui/button";
import { SSO_PROVIDERS, type SsoProvider } from "@/lib/auth/client";

const ICONS: Record<SsoProvider, typeof GoogleIcon> = {
  google: GoogleIcon,
  apple: AppleIcon,
};

/**
 * "Continue with Google / Apple" — the SSO half of the auth screens.
 *
 * Shown, and switched off, because neither is true on its own. The provider's
 * token exchange is not installed here, so there is nothing behind these buttons
 * that could prove an address belongs to the person typing it; the endpoint they
 * would call refuses for exactly that reason. Hiding them would leave the sign-in
 * screen looking finished while quietly dropping an option people came for, and
 * letting them navigate would hand the user an error page one click later. So
 * they say what is true: the option exists, it is not on yet, use the email link.
 *
 * Re-enabling is a small edit once the exchange lands — restore the click that
 * sends the browser to the provider, and drop the note.
 */
export function SocialLogin({
  dividerLabel = "atau lanjutkan dengan",
}: {
  dividerLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="border-editor-border h-px flex-1 border-t" />
        <span className="text-muted-foreground text-[11px]">{dividerLabel}</span>
        <span className="border-editor-border h-px flex-1 border-t" />
      </div>

      <div className="flex flex-col gap-2">
        {SSO_PROVIDERS.map(({ id, label }) => {
          const Icon = ICONS[id];
          return (
            <Button
              key={id}
              variant="outline"
              disabled
              title={`Masuk dengan ${label} belum aktif`}
              className="w-full"
            >
              <Icon />
              Masuk dengan {label}
            </Button>
          );
        })}
      </div>

      <p className="text-muted-foreground text-center text-[11px] leading-relaxed">
        Masuk lewat Google &amp; Apple belum aktif di instalasi ini. Pakai tautan
        masuk lewat email di atas.
      </p>
    </div>
  );
}
