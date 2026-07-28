import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { SocialLogin } from "@/components/auth/social-login";

export const metadata: Metadata = {
  title: "Daftar — FrameStudio AI",
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Buat akun"
      subtitle="Simpan karyamu agar aman lintas perangkat."
      footer={
        <>
          Sudah punya akun?{" "}
          <Link
            href="/masuk"
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            Masuk
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
      <RegisterForm />
      <SocialLogin dividerLabel="atau daftar dengan" />
    </AuthShell>
  );
}
