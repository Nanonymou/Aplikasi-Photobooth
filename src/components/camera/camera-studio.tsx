"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Check,
  FlipHorizontal2,
  RotateCcw,
  LoaderCircle,
  TimerOff,
  Upload,
  X,
  Zap,
  ZapOff,
} from "lucide-react";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { CameraPreview } from "@/components/camera/camera-preview";
import {
  CameraStatusChip,
  SlotProgress,
} from "@/components/camera/camera-status";
import { FlashOverlay } from "@/components/camera/flash-overlay";
import { ShotGallery } from "@/components/camera/shot-gallery";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAutosave } from "@/hooks/use-autosave";
import { useCamera } from "@/hooks/use-camera";
import { useCountdown } from "@/hooks/use-countdown";
import { captureFrame } from "@/lib/camera/capture";
import { demoShotSource } from "@/lib/camera/demo-shots";
import { fileToDataUrl, UploadError } from "@/lib/camera/upload";
import { createId } from "@/lib/editor/id";
import { cn } from "@/lib/utils";
import { useActivePage, useEditorStore } from "@/store/editor-store";
import type { CapturedShot } from "@/types/camera";
import type { PhotoSlotObject, SlotPhoto } from "@/types/editor";

/** `auto` means "the next empty slot"; otherwise a specific slot id. */
type SlotTarget = "auto" | string;

/** Self-timer choices, in seconds. 0 fires the shutter immediately. */
const TIMER_OPTIONS = [0, 3, 5, 10] as const;

/** Time the screen stays lit before the frame is grabbed, so exposure adapts. */
const FLASH_LEAD_MS = 160;
/** How long the burst lingers after the grab. */
const FLASH_TAIL_MS = 120;

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

/** Self-timer selector shown above the shutter. */
function TimerPicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (seconds: number) => void;
  disabled: boolean;
}) {
  return (
    <ToggleGroup
      type="single"
      size="sm"
      variant="outline"
      value={String(value)}
      onValueChange={(next) => next && onChange(Number(next))}
      disabled={disabled}
      aria-label="Timer sebelum menjepret"
    >
      {TIMER_OPTIONS.map((seconds) => (
        <ToggleGroupItem
          key={seconds}
          value={String(seconds)}
          aria-label={seconds === 0 ? "Tanpa timer" : `Timer ${seconds} detik`}
          className="px-3"
        >
          {seconds === 0 ? (
            <TimerOff className="size-4" />
          ) : (
            <span className="text-xs tabular-nums">{seconds}s</span>
          )}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
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
  const reduceMotion = useReducedMotion();
  useAutosave();

  const [demoRequested, setDemoRequested] = useState(false);
  const [shots, setShots] = useState<CapturedShot[]>([]);
  const [pending, setPending] = useState<PendingShot | null>(null);
  const [target, setTarget] = useState<SlotTarget>("auto");
  const [notice, setNotice] = useState<string | null>(null);
  const [timer, setTimer] = useState<number>(3);
  // Mirrored by default: people expect a selfie view of themselves.
  const [mirrored, setMirrored] = useState(true);
  const [flashEnabled, setFlashEnabled] = useState(true);
  const [flashing, setFlashing] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const slots = useSlots();
  const setSlotPhoto = useEditorStore((state) => state.setSlotPhoto);
  const fillNextEmptySlot = useEditorStore((state) => state.fillNextEmptySlot);

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

  /** Grabs the frame and hands it to a slot. Assumes the flash (if any) is lit. */
  const commitCapture = useCallback(() => {
    const src = demoMode
      ? demoShotSource(shots.length)
      : videoRef.current
        ? captureFrame(videoRef.current, { mirror: mirrored })
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
        source: demoMode ? "demo" : "camera",
        slotId: slot.id,
        slotName: slot.name,
      },
      previousPhoto: slot.photo,
    });
  }, [demoMode, shots.length, target, slots, setSlotPhoto, mirrored]);

  /**
   * Lights the screen first so the burst actually falls on the subject and the
   * camera's auto-exposure has a moment to react, then grabs the frame.
   */
  const capture = useCallback(() => {
    if (!flashEnabled || demoMode) {
      commitCapture();
      return;
    }

    setFlashing(true);
    window.setTimeout(() => {
      commitCapture();
      window.setTimeout(() => setFlashing(false), FLASH_TAIL_MS);
    }, FLASH_LEAD_MS);
  }, [flashEnabled, demoMode, commitCapture]);

  const countdown = useCountdown(capture);

  /** Shutter press: run the self-timer first when one is set. */
  const triggerShutter = useCallback(() => {
    if (countdown.running) {
      countdown.cancel();
      return;
    }
    countdown.start(timer);
  }, [countdown, timer]);

  /**
   * Places picked files into slots, in order. Uploads skip the review step: the
   * user already chose the image, so there is nothing to approve.
   */
  const handleFiles = useCallback(
    async (files: FileList | File[] | null) => {
      const list = files ? Array.from(files) : [];
      if (list.length === 0) return;

      setUploading(true);
      setNotice(null);

      let aim: SlotTarget = target;
      const problems: string[] = [];
      const placed: CapturedShot[] = [];

      for (const file of list) {
        try {
          const src = await fileToDataUrl(file);

          // `fillNextEmptySlot` reads live store state, so consecutive files land
          // in consecutive slots rather than all fighting for the same one.
          let slotId: string | null;
          if (aim === "auto") {
            slotId = fillNextEmptySlot(src);
          } else {
            setSlotPhoto(aim, { src, offsetX: 0, offsetY: 0, scale: 1 });
            slotId = aim;
            aim = "auto";
          }

          if (!slotId) {
            problems.push(
              "Semua slot sudah terisi — sisa gambar tidak ditempatkan.",
            );
            break;
          }

          const page = useEditorStore.getState().project.pages.find(
            (candidate) =>
              candidate.id === useEditorStore.getState().activePageId,
          );
          const slot = page?.objects.find((object) => object.id === slotId);

          placed.push({
            id: createId("shot"),
            src,
            takenAt: new Date().toISOString(),
            source: "upload",
            slotId,
            slotName: slot?.name ?? null,
          });
        } catch (error) {
          problems.push(
            error instanceof UploadError
              ? error.message
              : `"${file.name}" gagal diunggah.`,
          );
        }
      }

      if (placed.length > 0) setShots((current) => [...current, ...placed]);
      setTarget("auto");
      setNotice(problems[0] ?? null);
      setUploading(false);
    },
    [target, fillNextEmptySlot, setSlotPhoto],
  );

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

      if (countdown.running && event.code === "Escape") {
        event.preventDefault();
        countdown.cancel();
        return;
      }

      if (event.code === "Space" && canCapture) {
        event.preventDefault();
        triggerShutter();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [triggerShutter, canCapture, pending, keepShot, retakeShot, countdown]);

  const filled = slots.filter((slot) => slot.photo).length;

  return (
    <TooltipProvider>
      <FlashOverlay active={flashing} />
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
          <CameraStatusChip
            status={status}
            demoMode={demoMode}
            className="ml-auto"
          />
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="flex flex-col gap-4">
            {/* Dropping files anywhere on the viewfinder is the obvious gesture,
                so the drop target wraps the preview rather than a separate box. */}
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node)) {
                  return;
                }
                setDragActive(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                void handleFiles(event.dataTransfer.files);
              }}
              className={cn(
                "relative rounded-xl transition-shadow",
                dragActive && "ring-primary ring-4 ring-offset-2 ring-offset-background",
              )}
            >
              <CameraPreview
                videoRef={videoRef}
                stream={camera.stream}
                status={status}
                error={camera.error}
                demoMode={demoMode}
                mirrored={mirrored}
                reviewSrc={pending?.shot.src ?? null}
                countdown={countdown.remaining}
                onRetry={() => void start()}
                onUseDemo={enableDemo}
              />

              {dragActive && (
                <div className="bg-background/80 pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl">
                  <p className="text-sm font-medium">
                    Lepaskan gambar untuk mengisi slot
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-3">
              {/* The two control sets swap in place; `mode="wait"` keeps the
                  row from doubling in height mid-transition. */}
              <AnimatePresence mode="wait" initial={false}>
              {pending ? (
                <motion.div
                  key="review"
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="flex flex-wrap items-center justify-center gap-3"
                >
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
                </motion.div>
              ) : (
                <motion.div
                  key="shoot"
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <TimerPicker
                      value={timer}
                      onChange={setTimer}
                      disabled={countdown.running}
                    />

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={mirrored ? "secondary" : "ghost"}
                          size="icon"
                          onClick={() => setMirrored((on) => !on)}
                          aria-pressed={mirrored}
                          aria-label="Efek cermin"
                        >
                          <FlipHorizontal2 />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {mirrored ? "Cermin aktif" : "Cermin mati"}
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={flashEnabled ? "secondary" : "ghost"}
                          size="icon"
                          onClick={() => setFlashEnabled((on) => !on)}
                          aria-pressed={flashEnabled}
                          aria-label="Kilau layar sebagai flash"
                        >
                          {flashEnabled ? <Zap /> : <ZapOff />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {flashEnabled ? "Kilau aktif" : "Kilau mati"}
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button
                      size="lg"
                      className="min-w-44"
                      variant={countdown.running ? "outline" : "default"}
                      onClick={triggerShutter}
                      disabled={!canCapture}
                    >
                      {countdown.running ? (
                        <>
                          <X />
                          Batalkan
                        </>
                      ) : (
                        <>
                          <Camera />
                          Jepret
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? <LoaderCircle className="animate-spin" /> : <Upload />}
                      Unggah
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
                </motion.div>
              )}
              </AnimatePresence>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(event) => {
                  void handleFiles(event.target.files);
                  // Reset so picking the same file twice still fires a change.
                  event.target.value = "";
                }}
              />

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
                    : countdown.running
                      ? "Bersiap… tekan Esc untuk membatalkan"
                      : `Tekan Spasi untuk menjepret · ${filled}/${slots.length} slot terisi`)}
              </p>
            </div>
          </div>

          <aside className="flex flex-col gap-4">
            <SlotProgress filled={filled} total={slots.length} />
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
