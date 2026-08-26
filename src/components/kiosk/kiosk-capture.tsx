"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { CameraPreview } from "@/components/camera/camera-preview";
import { FlashOverlay } from "@/components/camera/flash-overlay";
import { Button } from "@/components/ui/button";
import { useCamera } from "@/hooks/use-camera";
import { useCountdown } from "@/hooks/use-countdown";
import { captureFrame } from "@/lib/camera/capture";
import { demoShotSource } from "@/lib/camera/demo-shots";
import { cn } from "@/lib/utils";
import { useActivePage, useEditorStore } from "@/store/editor-store";
import type { PhotoSlotObject } from "@/types/editor";

/** Seconds a guest gets to strike a pose before each shot. */
const POSE_SECONDS = 3;
/** Beat between one shot landing and the next countdown starting. */
const BETWEEN_SHOTS_MS = 900;
/** Screen stays lit briefly before the grab, so exposure has time to adapt. */
const FLASH_LEAD_MS = 160;
const FLASH_TAIL_MS = 120;

/**
 * The booth's capture flow.
 *
 * Not the editor's camera page with the chrome taken off — a booth is a
 * different job. There is no self-timer picker, no slot targeting, no upload, no
 * mirror toggle and no way back into the app, because the person in front of it
 * is a wedding guest holding a drink who will look at this screen once. It runs
 * itself: count down, flash, fill the next slot, count down again, and hand back
 * when the strip is full. The only control is a way out of a session started by
 * accident.
 *
 * It fills the open design's photo slots, so whatever template the organizer set
 * up before opening kiosk mode is what the guest gets.
 */
export function KioskCapture({
  onFinished,
  onCancel,
}: {
  onFinished: () => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const camera = useCamera();
  const reduceMotion = useReducedMotion();

  const page = useActivePage();
  const slots = page.objects.filter(
    (object): object is PhotoSlotObject => object.kind === "slot",
  );
  const fillNextEmptySlot = useEditorStore((state) => state.fillNextEmptySlot);

  const [flashing, setFlashing] = useState(false);
  const [taken, setTaken] = useState(0);

  const { start, status } = camera;
  useEffect(() => {
    void start();
  }, [start]);

  // A booth with no webcam — a demo machine, a denied prompt — still has to run
  // the whole flow, or the one screen nobody can rehearse is the one facing the
  // crowd.
  const demoMode = status === "unavailable" || status === "denied";

  const total = slots.length;
  const done = taken >= total;

  const shoot = useCallback(() => {
    setFlashing(true);

    window.setTimeout(() => {
      const src = demoMode
        ? demoShotSource(taken)
        : videoRef.current
          ? captureFrame(videoRef.current, { mirror: true })
          : null;

      if (src) {
        fillNextEmptySlot(src);
        setTaken((count) => count + 1);
      }

      window.setTimeout(() => setFlashing(false), FLASH_TAIL_MS);
    }, FLASH_LEAD_MS);
  }, [demoMode, fillNextEmptySlot, taken]);

  const countdown = useCountdown(shoot);
  const { start: startCountdown, cancel: cancelCountdown } = countdown;

  // The flow drives itself: each shot that lands schedules the next pose. The
  // camera has to be ready first, otherwise the first frame of the session is a
  // black rectangle.
  const ready = demoMode || status === "ready";
  useEffect(() => {
    if (!ready || done) return;

    const timer = window.setTimeout(
      () => startCountdown(POSE_SECONDS),
      taken === 0 ? 0 : BETWEEN_SHOTS_MS,
    );
    return () => window.clearTimeout(timer);
  }, [ready, done, taken, startCountdown]);

  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(onFinished, BETWEEN_SHOTS_MS);
    return () => window.clearTimeout(timer);
  }, [done, onFinished]);

  useEffect(() => cancelCountdown, [cancelCountdown]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-10">
      <FlashOverlay active={flashing} />

      <Button
        variant="ghost"
        size="sm"
        onClick={onCancel}
        className="text-muted-foreground/70 hover:text-foreground absolute top-4 left-4"
      >
        <X />
        Batal
      </Button>

      <div className="w-full max-w-3xl">
        <CameraPreview
          videoRef={videoRef}
          stream={camera.stream}
          status={status}
          error={camera.error}
          demoMode={demoMode}
          mirrored
          countdown={countdown.remaining}
          onRetry={() => void start()}
          onUseDemo={() => {}}
        />
      </div>

      {/* One dot per slot, filling as the session goes — a guest should be able
          to tell how many more times to smile without reading anything. */}
      <div className="flex items-center gap-3">
        {slots.map((slot, index) => (
          <motion.span
            key={slot.id}
            aria-hidden="true"
            animate={
              reduceMotion || index !== taken - 1 ? {} : { scale: [1, 1.35, 1] }
            }
            transition={{ duration: 0.4 }}
            className={cn(
              "size-3.5 rounded-full transition-colors",
              index < taken ? "bg-primary" : "bg-muted-foreground/30",
            )}
          />
        ))}
      </div>

      <p className="text-lg font-medium" aria-live="polite">
        {done
          ? "Selesai! Mengumpulkan hasilnya…"
          : `Foto ${Math.min(taken + 1, total)} dari ${total}`}
      </p>

      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <Camera className="size-4" />
        {countdown.running
          ? "Bergaya!"
          : demoMode
            ? "Mode demo — tanpa kamera."
            : "Bersiap…"}
      </p>
    </div>
  );
}
