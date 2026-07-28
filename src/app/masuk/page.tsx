import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { SocialLogin } from "@/components/auth/social-login";

export const metadata: Metadata = {
  title: "Masuk — FrameStudio AI",
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Masuk"
      subtitle="Buka kembali desain dan galeri fotomu."
      footer={
        <>
          Belum punya akun?{" "}
          <Link
            href="/daftar"
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            Daftar
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
      <LoginForm />
      <SocialLogin dividerLabel="atau masuk dengan" />
      <div className="border-editor-border border-t pt-3 text-center">
        <Link
          href="/masuk-tautan"
          className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
        >
          Masuk dengan tautan email
        </Link>
      </div>
    </AuthShell>
  );
}
