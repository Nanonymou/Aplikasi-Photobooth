"use client";

import { motion, useReducedMotion } from "motion/react";

import type { CameraStatus } from "@/hooks/use-camera";
import { cn } from "@/lib/utils";

interface StatusStyle {
  label: string;
  dot: string;
  /** Pulse the dot only while the state is genuinely "live". */
  live: boolean;
}

function describe(status: CameraStatus, demoMode: boolean): StatusStyle {
  if (demoMode) {
    return { label: "Mode demo", dot: "bg-amber-400", live: false };
  }

  switch (status) {
    case "ready":
      return { label: "Kamera aktif", dot: "bg-emerald-400", live: true };
    case "requesting":
      return { label: "Menunggu izin", dot: "bg-sky-400", live: true };
    case "denied":
      return { label: "Izin ditolak", dot: "bg-destructive", live: false };
    case "unavailable":
      return { label: "Kamera tidak tersedia", dot: "bg-muted-foreground", live: false };
    case "idle":
      return { label: "Kamera mati", dot: "bg-muted-foreground", live: false };
  }
}

/** Live state of the capture device, as a compact chip. */
export function CameraStatusChip({
  status,
  demoMode,
  className,
}: {
  status: CameraStatus;
  demoMode: boolean;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const style = describe(status, demoMode);

  return (
    <span
      className={cn(
        "border-editor-border inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        className,
      )}
      role="status"
    >
      <motion.span
        className={cn("size-2 rounded-full", style.dot)}
        animate={
          style.live && !reduceMotion ? { opacity: [1, 0.35, 1] } : { opacity: 1 }
        }
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
      {style.label}
    </span>
  );
}

/** How much of the frame is filled, as a bar plus a count. */
export function SlotProgress({
  filled,
  total,
}: {
  filled: number;
  total: number;
}) {
  const reduceMotion = useReducedMotion();
  const percent = total === 0 ? 0 : (filled / total) * 100;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
          Progres frame
        </span>
        <span className="text-xs tabular-nums">
          {filled}/{total}
        </span>
      </div>
      <div
        className="bg-editor-surface h-1.5 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={filled}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label="Slot foto terisi"
      >
        <motion.div
          className="bg-primary h-full rounded-full"
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={
            reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 28 }
          }
        />
      </div>
    </div>
  );
}
