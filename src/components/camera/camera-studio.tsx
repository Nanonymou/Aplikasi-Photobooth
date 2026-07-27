"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Images, Trash2 } from "lucide-react";

import { CameraPreview } from "@/components/camera/camera-preview";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCamera } from "@/hooks/use-camera";
import { demoShotSource } from "@/lib/camera/demo-shots";
import { createId } from "@/lib/editor/id";
import { cn } from "@/lib/utils";
import { useActivePage } from "@/store/editor-store";
import type { CapturedShot } from "@/types/camera";

/** JPEG quality for webcam grabs — high enough for print, small enough to keep. */
const CAPTURE_QUALITY = 0.92;

function grabFrame(video: HTMLVideoElement): string | null {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) return null;

  context.drawImage(video, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", CAPTURE_QUALITY);
}

/** Read-out of how many slots on the current page are still waiting for a photo. */
function SlotQueue() {
  const page = useActivePage();
  const slots = page.objects.filter((object) => object.kind === "slot");
  const empty = slots.filter((slot) => !slot.photo).length;

  return (
    <div className="border-editor-border rounded-lg border p-3">
      <p className="text-sm font-medium">{page.name}</p>
      <p className="text-muted-foreground mt-1 text-xs">
        {slots.length} slot foto · {empty} masih kosong
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {slots.map((slot) => (
          <span
            key={slot.id}
            title={slot.name}
            className={cn(
              "size-6 rounded border",
              slot.photo
                ? "border-primary bg-primary/30"
                : "border-editor-border bg-editor-surface",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * The photo session screen: a live viewfinder plus the shots taken so far.
 *
 * Countdown, mirror/flash, retake and sending shots into frame slots are
 * separate tasks; this page establishes the camera lifecycle and the session
 * state they build on.
 */
export function CameraStudio() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const camera = useCamera();
  const [demoRequested, setDemoRequested] = useState(false);
  const [shots, setShots] = useState<CapturedShot[]>([]);

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
    setShots((current) => {
      const src = demoMode
        ? demoShotSource(current.length)
        : videoRef.current
          ? grabFrame(videoRef.current)
          : null;

      if (!src) return current;

      return [
        ...current,
        {
          id: createId("shot"),
          src,
          takenAt: new Date().toISOString(),
          demo: demoMode,
        },
      ];
    });
  }, [demoMode]);

  const canCapture = demoMode || status === "ready";

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
            Bergaya di depan kamera, lalu ambil foto untuk mengisi frame.
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

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              className="min-w-40"
              onClick={capture}
              disabled={!canCapture}
            >
              <Camera />
              Ambil foto
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
        </div>

        <aside className="flex flex-col gap-4">
          <SlotQueue />

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
                Belum ada foto. Tekan &ldquo;Ambil foto&rdquo; untuk memulai
                sesi.
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
                      alt={`Jepretan ${new Date(shot.takenAt).toLocaleTimeString("id-ID")}`}
                      className="border-editor-border aspect-square w-full rounded-md border object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      className="absolute right-1 top-1 size-6 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      onClick={() =>
                        setShots((current) =>
                          current.filter((item) => item.id !== shot.id),
                        )
                      }
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
