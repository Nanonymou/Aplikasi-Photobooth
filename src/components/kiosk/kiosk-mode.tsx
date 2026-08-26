"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Aperture, ArrowRight, Lock, Maximize, ShieldOff } from "lucide-react";

import { KioskCapture } from "@/components/kiosk/kiosk-capture";
import { ExitPad } from "@/components/kiosk/exit-pad";
import { PageThumbnail } from "@/components/editor/page-thumbnail";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useKioskLock } from "@/hooks/use-kiosk-lock";
import type { KioskScreenConfig } from "@/lib/kiosk/kiosk-config";
import { useActivePage, useEditorStore } from "@/store/editor-store";
import type { PhotoSlotObject } from "@/types/editor";

/**
 * Where the organizer lands after unlocking the exit.
 *
 * The editor, not the admin console: kiosk mode is an operator's screen, and an
 * operator has no `admin.console` permission — sending them there would end an
 * unlocked booth on "akses ditolak". The editor is also where the strip they
 * just handed to a crowd was set up, so it is where they would go to change it.
 */
const EXIT_TO = "/editor";

/** How long the result stays up before the booth is ready for the next guest. */
const RESULT_SECONDS = 20;

/** Attract → capture → result, and back to the top. */
type Stage = "attract" | "capture" | "result";

/**
 * Kiosk mode: a booth, from the welcome screen to the finished strip.
 *
 * The organizer opens this and steps away; from here the screen belongs to the
 * crowd, and it has to survive a stranger who will tap anything. So the whole
 * session lives on this one screen — welcome, shoot, admire, reset — with no
 * navigation out of it and none of the app's chrome, rather than sending the
 * guest to `/kamera` and hoping they find their way back. The only way out is
 * the organizer's PIN, checked on the server, behind a control small enough that
 * a guest does not find it by accident.
 */
export function KioskMode({ config }: { config: KioskScreenConfig }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const lock = useKioskLock();

  const [stage, setStage] = useState<Stage>("attract");
  const [exitOpen, setExitOpen] = useState(false);

  const page = useActivePage();
  const setSlotPhoto = useEditorStore((state) => state.setSlotPhoto);

  /** Empties the strip so the next guest does not inherit the last one's face. */
  const clearShots = useCallback(() => {
    for (const object of page.objects) {
      if (object.kind === "slot" && (object as PhotoSlotObject).photo) {
        setSlotPhoto(object.id, null);
      }
    }
  }, [page.objects, setSlotPhoto]);

  const toAttract = useCallback(() => {
    clearShots();
    setStage("attract");
  }, [clearShots]);

  function begin() {
    clearShots();
    lock.engage();
    setStage("capture");
  }

  return (
    <main className="from-background to-primary/10 relative min-h-dvh overflow-hidden bg-gradient-to-b">
      {/* Organizer controls, kept small and out of the guest's line of sight. */}
      <div className="absolute top-4 right-4 z-20 flex gap-1.5">
        {lock.canFullscreen && !lock.fullscreen && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={lock.engage}
            aria-label="Layar penuh"
            className="text-muted-foreground/60 hover:text-foreground"
          >
            <Maximize />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setExitOpen(true)}
          aria-label="Keluar kiosk"
          className="text-muted-foreground/60 hover:text-foreground"
        >
          <Lock />
        </Button>
      </div>

      {stage === "attract" && (
        <AttractScreen config={config} reduceMotion={reduceMotion} onStart={begin} />
      )}

      {stage === "capture" && (
        <KioskCapture
          onFinished={() => setStage("result")}
          onCancel={toAttract}
        />
      )}

      {stage === "result" && (
        <ResultScreen config={config} onDone={toAttract} />
      )}

      {lock.escaped && <FullscreenCurtain onReturn={lock.engage} />}

      <Dialog open={exitOpen} onOpenChange={setExitOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Keluar dari kiosk</DialogTitle>
            <DialogDescription>
              {config.pinSet
                ? "Mode kiosk terkunci untuk tamu. Masukkan PIN penyelenggara untuk keluar."
                : "Booth ini belum punya PIN keluar, jadi tidak ada yang bisa diperiksa."}
            </DialogDescription>
          </DialogHeader>

          {config.pinSet ? (
            <ExitPad
              onUnlock={() => {
                lock.release();
                router.replace(EXIT_TO);
              }}
            />
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-muted-foreground flex items-start gap-2 text-xs leading-relaxed">
                <ShieldOff className="mt-0.5 size-3.5 shrink-0" />
                Sampai PIN diatur, siapa pun yang menemukan tombol ini bisa
                keluar dari mode kiosk. Atur PIN sebelum meninggalkan booth.
              </p>
              <Button
                onClick={() => {
                  lock.release();
                  router.replace(EXIT_TO);
                }}
              >
                Keluar sekarang
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function AttractScreen({
  config,
  reduceMotion,
  onStart,
}: {
  config: KioskScreenConfig;
  reduceMotion: boolean | null;
  onStart: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex max-w-2xl flex-col items-center gap-8">
        <span className="bg-primary text-primary-foreground flex size-16 items-center justify-center rounded-2xl">
          <Aperture className="size-8" />
        </span>

        <div className="flex flex-col gap-3">
          <p className="text-primary text-sm font-medium tracking-wide uppercase">
            Photobooth
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            {config.eventName}
          </h1>
          <p className="text-muted-foreground text-lg text-pretty sm:text-xl">
            {config.tagline}
          </p>
        </div>

        <motion.div
          animate={reduceMotion ? {} : { scale: [1, 1.03, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Button
            size="lg"
            onClick={onStart}
            className="h-16 gap-3 rounded-2xl px-10 text-lg"
          >
            Ketuk untuk mulai
            <ArrowRight className="size-5" />
          </Button>
        </motion.div>
      </div>

      <p className="text-muted-foreground/70 absolute bottom-6 text-xs">
        Diselenggarakan dengan {config.brandName}
      </p>
    </div>
  );
}

/**
 * The finished strip, and the booth handing itself back.
 *
 * It returns on its own, because the guest who walks away with their print is
 * not going to press "done" — and a booth left showing somebody else's photos
 * is both an awkward welcome and a small privacy leak.
 */
function ResultScreen({
  config,
  onDone,
}: {
  config: KioskScreenConfig;
  onDone: () => void;
}) {
  const page = useActivePage();
  const [remaining, setRemaining] = useState(RESULT_SECONDS);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemaining((left) => {
        if (left <= 1) {
          window.clearInterval(timer);
          onDone();
          return 0;
        }
        return left - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [onDone]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-12 text-center">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Sudah jadi!
        </h2>
        <p className="text-muted-foreground text-lg">
          Ambil hasil cetakmu, dan terima kasih sudah mampir.
        </p>
      </div>

      <PageThumbnail
        page={page}
        className="border-editor-border max-h-[45dvh] rounded-lg border shadow-xl"
      />

      <div className="flex flex-col items-center gap-3">
        <Button size="lg" onClick={onDone} className="h-14 rounded-2xl px-8">
          Selesai
        </Button>
        <p className="text-muted-foreground text-xs tabular-nums" aria-live="off">
          Kembali ke layar awal dalam {remaining} detik
        </p>
      </div>

      <p className="text-muted-foreground/70 absolute bottom-6 text-xs">
        Diselenggarakan dengan {config.brandName}
      </p>
    </div>
  );
}

/**
 * The curtain that goes up when the screen leaves fullscreen.
 *
 * A page cannot refuse Escape or F11, so the booth cannot stop a guest from
 * dropping out of fullscreen — it can only make the way back the single thing on
 * screen, which is also what an organizer who did it by accident needs.
 */
function FullscreenCurtain({ onReturn }: { onReturn: () => void }) {
  return (
    <div className="bg-background/95 fixed inset-0 z-30 flex flex-col items-center justify-center gap-6 px-6 text-center backdrop-blur">
      <Maximize className="text-muted-foreground size-8" />
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          Layar penuh mati
        </h2>
        <p className="text-muted-foreground max-w-sm text-sm text-pretty">
          Booth ini dibuat untuk layar penuh. Ketuk untuk kembali — sesi fotomu
          tidak hilang.
        </p>
      </div>
      <Button size="lg" onClick={onReturn} className="h-14 rounded-2xl px-8">
        Kembali ke layar penuh
      </Button>
    </div>
  );
}
