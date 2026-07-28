import Link from "next/link";
import { Aperture, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <span className="bg-primary text-primary-foreground flex size-14 items-center justify-center rounded-2xl">
        <Aperture className="size-7" />
      </span>

      <div className="flex max-w-xl flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
          Photobooth dan editor frame, dalam satu layar
        </h1>
        <p className="text-muted-foreground text-base text-pretty sm:text-lg">
          Potret lewat webcam, susun slot foto sesukamu, percantik dengan stiker
          dan AI, lalu ekspor siap cetak.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <Button asChild size="lg">
          <Link href="/tamu">
            Mulai sebagai tamu
            <ArrowRight />
          </Link>
        </Button>
        <p className="text-muted-foreground text-xs">
          Tanpa akun — karyamu tersimpan di perangkat ini.
        </p>
      </div>

      <p className="text-muted-foreground text-sm">
        Sudah punya akun?{" "}
        <Link
          href="/masuk"
          className="text-primary font-medium underline-offset-4 hover:underline"
        >
          Masuk
        </Link>{" "}
        ·{" "}
        <Link
          href="/daftar"
          className="hover:text-foreground underline-offset-4 hover:underline"
        >
          Daftar
        </Link>
      </p>
    </main>
  );
}
