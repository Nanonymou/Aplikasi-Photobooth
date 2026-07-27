"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Check, RotateCcw } from "lucide-react";

import { CameraPreview } from "@/components/camera/camera-preview";
import { ShotGallery } from "@/components/camera/shot-gallery";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAutosave } from "@/hooks/use-autosave";
import { useCamera } from "@/hooks/use-camera";
import { captureFrame } from "@/lib/camera/capture";
import { demoShotSource } from "@/lib/camera/demo-shots";
import { createId } from "@/lib/editor/id";
import { cn } from "@/lib/utils";
import { useActivePage, useEditorStore } from "@/store/editor-store";
import type { CapturedShot } from "@/types/camera";
import type { PhotoSlotObject, SlotPhoto } from "@/types/editor";

/** `auto` means "the next empty slot"; otherwise a specific slot id. */
type SlotTarget = "auto" | string;

/**
 * A shot waiting for the user's verdict. `previousPhoto` is what the slot held
 * before, so "ambil ulang" can put it back instead of leaving a hole.
 */
interface PendingShot {
  shot: CapturedShot;
  previousPhoto: SlotPhoto | null;
}

function useSlots(): PhotoSlotObject[] {
  const page = useActivePage();
  return page.objects.filter(
    (object): object is PhotoSlotObject => object.kind === "slot",
  );
}

/** Slot map for the active page; clicking a slot aims the next shot at it. */
function SlotQueue({
  slots,
  target,
  onTarget,
}: {
  slots: PhotoSlotObject[];
  target: SlotTarget;
  onTarget: (target: SlotTarget) => void;
}) {
  const page = useActivePage();
  const empty = slots.filter((slot) => !slot.photo).length;

  return (
    <div className="border-editor-border flex flex-col gap-3 rounded-lg border p-3">
      <div>
        <p className="text-sm font-medium">{page.name}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {slots.length} slot foto · {empty} masih kosong
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {slots.map((slot, index) => {
          const aimed = target === slot.id;

          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => onTarget(aimed ? "auto" : slot.id)}
              title={`${slot.name}${slot.photo ? " (terisi)" : ""}`}
              aria-pressed={aimed}
              className={cn(
                "flex size-8 items-center justify-center rounded border text-[10px] font-medium transition-colors",
                "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
                aimed
                  ? "border-primary bg-primary text-primary-foreground"
                  : slot.photo
                    ? "border-primary/60 bg-primary/25"
                    : "border-editor-border bg-editor-surface",
              )}
            >
              {index + 1}
            </button>
          );
        })}
      </div>

      <p className="text-muted-foreground text-xs leading-relaxed">
        {target === "auto"
          ? "Foto berikutnya mengisi slot kosong pertama."
          : "Foto berikutnya menimpa slot yang dipilih. Klik lagi untuk kembali otomatis."}
      </p>
    </div>
  );
}

/**
 * The photo session screen: viewfinder, shutter, a review step for each shot,
 * and the session gallery. Confirmed shots live in frame slots on the canvas.
 */
export function CameraStudio() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const camera = useCamera();
  useAutosave();

  const [demoRequested, setDemoRequested] = useState(false);
  const [shots, setShots] = useState<CapturedShot[]>([]);
  const [pending, setPending] = useState<PendingShot | null>(null);
  const [target, setTarget] = useState<SlotTarget>("auto");
  const [notice, setNotice] = useState<string | null>(null);

  const slots = useSlots();
  const setSlotPhoto = useEditorStore((state) => state.setSlotPhoto);

  const { start, status } = camera;

  useEffect(() => {
    void start();
  }, [start]);

  // Derived rather than synced in an effect: a machine with no webcam falls back
  // automatically, so the page is never a dead end, and retrying re-evaluates it.
  const demoMode = demoRequested || status === "unavailable";

  const enableDemo = useCallback(() => {
    camera.release();
    setDemoRequested(true);
  }, [camera]);

  const leaveDemo = useCallback(() => {
    setDemoRequested(false);
    void start();
  }, [start]);

  const capture = useCallback(() => {
    const src = demoMode
      ? demoShotSource(shots.length)
      : videoRef.current
        ? captureFrame(videoRef.current)
        : null;

    if (!src) {
      setNotice("Kamera belum siap. Tunggu sebentar lalu coba lagi.");
      return;
    }

    const slot =
      target === "auto"
        ? slots.find((candidate) => !candidate.photo)
        : slots.find((candidate) => candidate.id === target);

    if (!slot) {
      setNotice(
        "Semua slot sudah terisi. Pilih nomor slot di atas untuk menimpa.",
      );
      return;
    }

    setNotice(null);
    setSlotPhoto(slot.id, { src, offsetX: 0, offsetY: 0, scale: 1 });
    setPending({
      shot: {
        id: createId("shot"),
        src,
        takenAt: new Date().toISOString(),
        demo: demoMode,
        slotId: slot.id,
        slotName: slot.name,
      },
      previousPhoto: slot.photo,
    });
  }, [demoMode, shots.length, target, slots, setSlotPhoto]);

  const keepShot = useCallback(() => {
    if (!pending) return;
    setShots((current) => [...current, pending.shot]);
    setPending(null);
    // One shot per aim, so the next press does not silently overwrite again.
    setTarget("auto");
  }, [pending]);

  const retakeShot = useCallback(() => {
    if (!pending) return;
    // Put back whatever the slot held before, then aim at it for the redo.
    if (pending.shot.slotId) {
      setSlotPhoto(pending.shot.slotId, pending.previousPhoto);
      setTarget(pending.shot.slotId);
    }
    setPending(null);
  }, [pending, setSlotPhoto]);

  const retakeFromGallery = useCallback(
    (shot: CapturedShot) => {
      if (shot.slotId) {
        setSlotPhoto(shot.slotId, null);
        setTarget(shot.slotId);
      }
      setShots((current) => current.filter((item) => item.id !== shot.id));
    },
    [setSlotPhoto],
  );

  const deleteShot = useCallback(
    (shot: CapturedShot) => {
      if (shot.slotId) setSlotPhoto(shot.slotId, null);
      setShots((current) => current.filter((item) => item.id !== shot.id));
    },
    [setSlotPhoto],
  );

  const canCapture = demoMode || status === "ready";

  // Space is the shutter, and confirms while a shot is under review.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const focused = event.target;
      if (
        focused instanceof HTMLElement &&
        ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(focused.tagName)
      ) {
        return; // Space already activates a focused control; don't fire twice.
      }

      if (pending) {
        if (event.code === "Space") {
          event.preventDefault();
          keepShot();
        } else if (event.code === "KeyR" || event.code === "Escape") {
          event.preventDefault();
          retakeShot();
        }
        return;
      }

      if (event.code === "Space" && canCapture) {
        event.preventDefault();
        capture();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [capture, canCapture, pending, keepShot, retakeShot]);

  const filled = slots.filter((slot) => slot.photo).length;

  return (
    <TooltipProvider>
      <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-6 p-4 sm:p-6">
        <header className="flex flex-wrap items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/editor">
              <ArrowLeft />
              Kembali ke editor
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight">
              Sesi Foto
            </h1>
            <p className="text-muted-foreground text-xs">
              Bergaya di depan kamera, lalu tekan jepret untuk mengisi frame.
            </p>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="flex flex-col gap-4">
            <CameraPreview
              videoRef={videoRef}
              stream={camera.stream}
              status={status}
              error={camera.error}
              demoMode={demoMode}
              reviewSrc={pending?.shot.src ?? null}
              onRetry={() => void start()}
              onUseDemo={enableDemo}
            />

            <div className="flex flex-col items-center gap-3">
              {pending ? (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button size="lg" className="min-w-40" onClick={keepShot}>
                    <Check />
                    Pakai foto
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="min-w-40"
                    onClick={retakeShot}
                  >
                    <RotateCcw />
                    Ambil ulang
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    size="lg"
                    className="min-w-44"
                    onClick={capture}
                    disabled={!canCapture}
                  >
                    <Camera />
                    Jepret
                  </Button>

                  {demoMode ? (
                    <Button variant="outline" size="sm" onClick={leaveDemo}>
                      Coba kamera asli
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={enableDemo}>
                      Mode demo
                    </Button>
                  )}
                </div>
              )}

              <p
                className={cn(
                  "text-center text-xs",
                  notice ? "text-destructive" : "text-muted-foreground",
                )}
                aria-live="polite"
              >
                {notice ??
                  (pending
                    ? `Menuju ${pending.shot.slotName} · Spasi untuk pakai, R untuk ambil ulang`
                    : `Tekan Spasi untuk menjepret · ${filled}/${slots.length} slot terisi`)}
              </p>
            </div>
          </div>

          <aside className="flex flex-col gap-4">
            <SlotQueue slots={slots} target={target} onTarget={setTarget} />

            {camera.devices.length > 1 && !demoMode && (
              <label className="flex flex-col gap-1.5">
                <span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                  Perangkat kamera
                </span>
                <select
                  value={camera.deviceId ?? ""}
                  onChange={(event) => camera.selectDevice(event.target.value)}
                  className="border-input bg-background h-9 rounded-md border px-2 text-sm"
                >
                  {camera.devices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <Separator />

            <ShotGallery
              shots={shots}
              onRetake={retakeFromGallery}
              onDelete={deleteShot}
            />

            {/* Rendered as a real button when there is nothing to carry over:
                `disabled` on an anchor is ignored, so it would still navigate. */}
            {shots.length > 0 ? (
              <Button asChild variant="secondary">
                <Link href="/editor">Lanjut ke editor</Link>
              </Button>
            ) : (
              <Button variant="secondary" disabled>
                Lanjut ke editor
              </Button>
            )}
          </aside>
        </div>
      </main>
    </TooltipProvider>
  );
}
