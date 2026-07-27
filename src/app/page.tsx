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

      <Button asChild size="lg">
        <Link href="/editor">
          Buka editor
          <ArrowRight />
        </Link>
      </Button>
    </main>
  );
}
