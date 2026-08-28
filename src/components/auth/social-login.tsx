"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { AppleIcon, GoogleIcon } from "@/components/auth/provider-icons";
import { Button } from "@/components/ui/button";
import {
  oauthAuthorizeUrl,
  SSO_PROVIDERS,
  type SsoProvider,
} from "@/lib/auth/client";

const ICONS: Record<SsoProvider, typeof GoogleIcon> = {
  google: GoogleIcon,
  apple: AppleIcon,
};

/**
 * "Continue with Google / Apple" — the SSO half of the auth screens.
 *
 * The whole appeal of social sign-in is skipping the form, so this sits beside
 * the email fields as a full alternative, not an afterthought: two provider
 * buttons under a plain divider. A click hands off to the provider (mocked: to
 * our own callback) and the button stays busy through the navigation, so both
 * are locked — you cannot start a second round trip mid-flight. Everything after
 * the redirect belongs to the callback page, not here.
 */
export function SocialLogin({
  dividerLabel = "atau lanjutkan dengan",
}: {
  dividerLabel?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<SsoProvider | null>(null);

  function connect(provider: SsoProvider) {
    if (pending) return;
    setPending(provider);
    router.push(oauthAuthorizeUrl(provider));
  }

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
              onClick={() => connect(id)}
              disabled={pending !== null}
              className="w-full"
            >
              {pending === id ? <Loader2 className="animate-spin" /> : <Icon />}
              Masuk dengan {label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
