"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Aperture, ArrowRight, Delete, Lock, Maximize } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KIOSK_CONFIG, PIN_LENGTH } from "@/lib/kiosk/kiosk-config";
import { cn } from "@/lib/utils";

/** Where the organizer lands after unlocking the exit. */
const EXIT_TO = "/admin";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

/**
 * The PIN pad that guards the exit.
 *
 * A guest must not be able to leave kiosk mode, so leaving is a deliberate act:
 * the organizer enters their PIN on a touch pad sized for a booth screen. It
 * checks on the last digit — right PIN leaves, wrong PIN clears with a shake and
 * says so — so there is no submit button to fumble for.
 */
function ExitPad({ onUnlock }: { onUnlock: () => void }) {
  const reduceMotion = useReducedMotion();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  function press(key: string) {
    if (key === "back") {
      setError(false);
      setPin((current) => current.slice(0, -1));
      return;
    }
    if (pin.length >= PIN_LENGTH) return;

    const next = pin + key;
    setError(false);
    setPin(next);

    if (next.length === PIN_LENGTH) {
      if (next === KIOSK_CONFIG.exitPin) {
        onUnlock();
      } else {
        setError(true);
        setPin("");
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <motion.div
        className="flex gap-3"
        animate={error && !reduceMotion ? { x: [0, -6, 6, -4, 4, 0] } : {}}
        transition={{ duration: 0.35 }}
      >
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span
            key={i}
            className={cn(
              "size-3.5 rounded-full border-2 transition-colors",
              i < pin.length
                ? "border-primary bg-primary"
                : "border-muted-foreground/40",
            )}
          />
        ))}
      </motion.div>

      <div className="grid grid-cols-3 gap-2.5">
        {KEYS.map((key, index) =>
          key === "" ? (
            <span key={index} />
          ) : (
            <Button
              key={index}
              variant="outline"
              onClick={() => press(key)}
              aria-label={key === "back" ? "Hapus" : `Angka ${key}`}
              className="size-16 rounded-xl text-xl font-medium"
            >
              {key === "back" ? <Delete className="size-5" /> : key}
            </Button>
          ),
        )}
      </div>

      <p
        className={cn(
          "text-xs",
          error ? "text-destructive" : "text-muted-foreground",
        )}
        aria-live="polite"
      >
        {error ? "PIN salah. Coba lagi." : "Masukkan PIN penyelenggara."}
      </p>
    </div>
  );
}

/**
 * Kiosk mode: the booth's attract screen.
 *
 * The organizer opens this and steps away; from here the screen belongs to the
 * crowd. It is deliberately a dead simple welcome — event name and one giant
 * "start" target a stranger cannot misread — with all of the app's chrome gone so
 * there is nothing to wander into. The only way back out is the organizer's PIN,
 * tucked in a corner where a guest will not find it by accident.
 */
export function KioskMode() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [exitOpen, setExitOpen] = useState(false);

  function goFullscreen() {
    // Best-effort: browsers reject this without a gesture (we have one) and some
    // environments have no fullscreen at all. Either way the kiosk still works.
    document.documentElement.requestFullscreen?.().catch(() => {});
  }

  return (
    <main className="from-background to-primary/10 relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-gradient-to-b px-6 py-12 text-center">
      {/* Organizer controls, kept small and out of the guest's line of sight. */}
      <div className="absolute top-4 right-4 flex gap-1.5">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={goFullscreen}
          aria-label="Layar penuh"
          className="text-muted-foreground/60 hover:text-foreground"
        >
          <Maximize />
        </Button>
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

      <div className="flex max-w-2xl flex-col items-center gap-8">
        <span className="bg-primary text-primary-foreground flex size-16 items-center justify-center rounded-2xl">
          <Aperture className="size-8" />
        </span>

        <div className="flex flex-col gap-3">
          <p className="text-primary text-sm font-medium tracking-wide uppercase">
            Photobooth
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            {KIOSK_CONFIG.eventName}
          </h1>
          <p className="text-muted-foreground text-lg text-pretty sm:text-xl">
            {KIOSK_CONFIG.tagline}
          </p>
        </div>

        <motion.div
          animate={reduceMotion ? {} : { scale: [1, 1.03, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Button
            size="lg"
            onClick={() => router.push("/kamera")}
            className="h-16 gap-3 rounded-2xl px-10 text-lg"
          >
            Ketuk untuk mulai
            <ArrowRight className="size-5" />
          </Button>
        </motion.div>
      </div>

      <p className="text-muted-foreground/70 absolute bottom-6 text-xs">
        Diselenggarakan dengan {KIOSK_CONFIG.brandName}
      </p>

      <Dialog open={exitOpen} onOpenChange={setExitOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Keluar dari kiosk</DialogTitle>
            <DialogDescription>
              Mode kiosk terkunci untuk tamu. Masukkan PIN penyelenggara untuk
              keluar.
            </DialogDescription>
          </DialogHeader>
          <AnimatePresence>
            <ExitPad onUnlock={() => router.replace(EXIT_TO)} />
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </main>
  );
}
