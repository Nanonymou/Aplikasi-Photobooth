import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyMagicLink } from "@/components/auth/verify-magic-link";

export const metadata: Metadata = {
  title: "Memverifikasi tautan — FrameStudio AI",
};

export default function VerifyPage() {
  return (
    <AuthShell
      title="Masuk"
      subtitle="Sebentar, kami sedang memeriksa tautanmu."
      footer={null}
    >
      {/* useSearchParams needs a Suspense boundary; the fallback matches the
          form's own verifying state so there is no flash. */}
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <Loader2 className="text-muted-foreground size-6 animate-spin" />
            <p className="text-muted-foreground text-sm">
              Memverifikasi tautan…
            </p>
          </div>
        }
      >
        <VerifyMagicLink />
      </Suspense>
    </AuthShell>
  );
}
