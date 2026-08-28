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
      {/* The form above *is* the email-link flow now, so the link that used to
          point at /masuk-tautan would only lead to a second copy of it. */}
      <LoginForm />
      <SocialLogin dividerLabel="atau masuk dengan" />
    </AuthShell>
  );
}
