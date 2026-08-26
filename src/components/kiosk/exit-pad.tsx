"use client";

import { useState } from "react";
import { Delete, LoaderCircle } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { Button } from "@/components/ui/button";
import { PIN_LENGTH, submitExitPin } from "@/lib/kiosk/kiosk-config";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

function lockoutMessage(seconds: number | null): string {
  if (seconds === null) return "Terlalu banyak percobaan. Coba lagi nanti.";

  const minutes = Math.ceil(seconds / 60);
  return `Terlalu banyak percobaan. Coba lagi dalam ${minutes} menit.`;
}

/**
 * The PIN pad that guards the exit.
 *
 * The digits go to `POST /api/kiosk/unlock` and the answer comes back from
 * there. That is the whole point: an unattended booth is a device a guest can
 * open devtools on, and a PIN the page could compare is a PIN the page was
 * given. The screen learns only "yes" or "no", never how close a guess was.
 *
 * It checks on the last digit rather than behind a submit button — there is no
 * keyboard at a booth, and an organizer reaching past a guest wants four taps,
 * not five.
 */
export function ExitPad({ onUnlock }: { onUnlock: () => void }) {
  const reduceMotion = useReducedMotion();
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function check(candidate: string) {
    setBusy(true);
    const result = await submitExitPin(candidate);
    setBusy(false);
    setPin("");

    if (result.ok) {
      onUnlock();
      return;
    }

    setFailed(true);
    if (result.kind === "wrong") {
      // The last wrong PIN still comes back as a plain rejection — the lockout
      // only announces itself on the *next* try. Saying "sisa 0 percobaan" and
      // stopping there would leave an organizer tapping at a pad that has
      // already stopped listening.
      setMessage(
        result.attemptsRemaining === null
          ? "PIN salah. Coba lagi."
          : result.attemptsRemaining === 0
            ? "PIN salah. Percobaan habis — tunggu beberapa menit."
            : `PIN salah. Sisa ${result.attemptsRemaining} percobaan.`,
      );
    } else if (result.kind === "locked") {
      setMessage(lockoutMessage(result.retryAfterSeconds));
    } else {
      setMessage(result.message);
    }
  }

  function press(key: string) {
    if (busy) return;

    if (key === "back") {
      setFailed(false);
      setPin((current) => current.slice(0, -1));
      return;
    }
    if (pin.length >= PIN_LENGTH) return;

    const next = pin + key;
    setFailed(false);
    setMessage(null);
    setPin(next);

    if (next.length === PIN_LENGTH) void check(next);
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <motion.div
        className="flex gap-3"
        animate={failed && !reduceMotion ? { x: [0, -6, 6, -4, 4, 0] } : {}}
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
              disabled={busy}
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
          "flex items-center gap-1.5 text-center text-xs",
          failed ? "text-destructive" : "text-muted-foreground",
        )}
        aria-live="polite"
      >
        {busy && <LoaderCircle className="size-3 animate-spin" />}
        {busy
          ? "Memeriksa…"
          : (message ?? "Masukkan PIN penyelenggara.")}
      </p>
    </div>
  );
}
