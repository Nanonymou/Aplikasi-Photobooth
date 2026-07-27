"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Check, Images, Trash2 } from "lucide-react";

import { CameraPreview } from "@/components/camera/camera-preview";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAutosave } from "@/hooks/use-autosave";
import { useCamera } from "@/hooks/use-camera";
import { captureFrame } from "@/lib/camera/capture";
import { demoShotSource } from "@/lib/camera/demo-shots";
import { createId } from "@/lib/editor/id";
import { cn } from "@/lib/utils";
import { useActivePage, useEditorStore } from "@/store/editor-store";
import type { CapturedShot } from "@/types/camera";
import type { PhotoSlotObject } from "@/types/editor";

/** `auto` means "the next empty slot"; otherwise a specific slot id. */
type SlotTarget = "auto" | string;

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
 * The photo session screen: a live viewfinder, a shutter, and the shots taken so
 * far — each one written straight into a frame slot on the canvas.
 */
export function CameraStudio() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const camera = useCamera();
  useAutosave();

  const [demoRequested, setDemoRequested] = useState(false);
  const [shots, setShots] = useState<CapturedShot[]>([]);
  const [target, setTarget] = useState<SlotTarget>("auto");
  const [notice, setNotice] = useState<string | null>(null);

  const slots = useSlots();
  const fillNextEmptySlot = useEditorStore((state) => state.fillNextEmptySlot);
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

    let slotId: string | null = null;

    if (target === "auto") {
      slotId = fillNextEmptySlot(src);
      setNotice(
        slotId
          ? null
          : "Semua slot sudah terisi. Pilih nomor slot di atas untuk menimpa.",
      );
    } else {
      setSlotPhoto(target, { src, offsetX: 0, offsetY: 0, scale: 1 });
      slotId = target;
      setNotice(null);
      // One shot per aim: fall back to auto so the next press does not
      // silently overwrite the same slot again.
      setTarget("auto");
    }

    const slot = slots.find((candidate) => candidate.id === slotId);

    setShots((current) => [
      ...current,
      {
        id: createId("shot"),
        src,
        takenAt: new Date().toISOString(),
        demo: demoMode,
        slotId,
        slotName: slot?.name ?? null,
      },
    ]);
  }, [
    demoMode,
    shots.length,
    target,
    fillNextEmptySlot,
    setSlotPhoto,
    slots,
  ]);

  const canCapture = demoMode || status === "ready";

  // Space is the shutter, the way a physical camera would behave.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== "Space" || !canCapture) return;

      // Space already activates a focused control; don't fire twice.
      const focused = event.target;
      if (
        focused instanceof HTMLElement &&
        ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(focused.tagName)
      ) {
        return;
      }

      event.preventDefault();
      capture();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [capture, canCapture]);

  const filled = slots.filter((slot) => slot.photo).length;

  return (
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
            onRetry={() => void start()}
            onUseDemo={enableDemo}
          />

          <div className="flex flex-col items-center gap-3">
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

            <p
              className={cn(
                "text-center text-xs",
                notice ? "text-destructive" : "text-muted-foreground",
              )}
              aria-live="polite"
            >
              {notice ?? `Tekan Spasi untuk menjepret · ${filled}/${slots.length} slot terisi`}
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

          <section className="flex min-h-0 flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-medium">
                <Images className="size-4" />
                Hasil jepretan
              </h2>
              <span className="text-muted-foreground text-xs tabular-nums">
                {shots.length}
              </span>
            </div>

            {shots.length === 0 ? (
              <p className="text-muted-foreground border-editor-border rounded-lg border border-dashed p-4 text-xs leading-relaxed">
                Belum ada foto. Tekan &ldquo;Jepret&rdquo; untuk memulai sesi.
              </p>
            ) : (
              <ul className="grid grid-cols-3 gap-2">
                {shots.map((shot) => (
                  <li key={shot.id} className="group relative">
                    {/* Sources are data URLs or local samples, so next/image
                        would add a loader round-trip for no benefit. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={shot.src}
                      alt={
                        shot.slotName
                          ? `Jepretan di ${shot.slotName}`
                          : "Jepretan belum ditempatkan"
                      }
                      className="border-editor-border aspect-square w-full rounded-md border object-cover"
                    />
                    {shot.slotName && (
                      <span
                        className="bg-primary text-primary-foreground absolute bottom-1 left-1 flex size-4 items-center justify-center rounded-full"
                        title={`Tersimpan ke ${shot.slotName}`}
                      >
                        <Check className="size-2.5" />
                      </span>
                    )}
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      className="absolute right-1 top-1 size-6 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      onClick={() => {
                        if (shot.slotId) setSlotPhoto(shot.slotId, null);
                        setShots((current) =>
                          current.filter((item) => item.id !== shot.id),
                        );
                      }}
                      aria-label="Hapus jepretan"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

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
  );
}
