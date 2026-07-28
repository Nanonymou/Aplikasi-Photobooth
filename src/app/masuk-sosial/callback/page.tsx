import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { OAuthCallback } from "@/components/auth/oauth-callback";

export const metadata: Metadata = {
  title: "Menyelesaikan masuk — FrameStudio AI",
};

export default function OAuthCallbackPage() {
  return (
    <AuthShell
      title="Masuk"
      subtitle="Sebentar, kami sedang menyelesaikan proses masuk."
      footer={null}
    >
      {/* useSearchParams needs a Suspense boundary; the fallback matches the
          callback's own completing state so there is no flash. */}
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <Loader2 className="text-muted-foreground size-6 animate-spin" />
            <p className="text-muted-foreground text-sm">
              Menyelesaikan masuk…
            </p>
          </div>
        }
      >
        <OAuthCallback />
      </Suspense>
    </AuthShell>
  );
}
