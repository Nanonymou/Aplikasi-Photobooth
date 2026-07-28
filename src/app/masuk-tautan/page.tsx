import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { MagicLinkForm } from "@/components/auth/magic-link-form";

export const metadata: Metadata = {
  title: "Masuk dengan tautan — FrameStudio AI",
};

export default function MagicLinkPage() {
  return (
    <AuthShell
      title="Masuk tanpa kata sandi"
      subtitle="Kirim tautan masuk ke emailmu — tanpa perlu mengingat sandi."
      footer={
        <>
          Pakai kata sandi?{" "}
          <Link
            href="/masuk"
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            Masuk biasa
          </Link>{" "}
          ·{" "}
          <Link
            href="/tamu"
            className="hover:text-foreground underline-offset-4 hover:underline"
          >
            Lanjut sebagai tamu
          </Link>
        </>
      }
    >
      <MagicLinkForm />
    </AuthShell>
  );
}
