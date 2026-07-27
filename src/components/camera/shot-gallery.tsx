"use client";

import { Check, Images, RotateCcw, Trash2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CapturedShot, ShotSource } from "@/types/camera";

const SOURCE_LABELS: Record<ShotSource, string> = {
  camera: "kamera",
  upload: "unggahan",
  demo: "demo",
};

function takenAtLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Session gallery: every confirmed shot, which slot it went to, and the actions
 * for redoing or dropping it.
 */
export function ShotGallery({
  shots,
  onRetake,
  onDelete,
}: {
  shots: CapturedShot[];
  /** Clears the shot's slot and aims the camera back at it. */
  onRetake: (shot: CapturedShot) => void;
  onDelete: (shot: CapturedShot) => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
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
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {shots.map((shot) => (
            <motion.li
              key={shot.id}
              layout={!reduceMotion}
              initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="border-editor-border flex items-center gap-3 rounded-lg border p-2"
            >
              {/* Data URLs and local samples — next/image adds nothing here. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shot.src}
                alt={
                  shot.slotName
                    ? `Jepretan di ${shot.slotName}`
                    : "Jepretan belum ditempatkan"
                }
                className="border-editor-border size-12 shrink-0 rounded-md border object-cover"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">
                  {shot.slotName ?? "Belum ditempatkan"}
                </p>
                <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
                  {shot.slotName && <Check className="size-3" />}
                  {takenAtLabel(shot.takenAt)}
                  {shot.source !== "camera" && ` · ${SOURCE_LABELS[shot.source]}`}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onRetake(shot)}
                      disabled={!shot.slotId}
                      aria-label={`Ambil ulang ${shot.slotName ?? "jepretan"}`}
                    >
                      <RotateCcw />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Ambil ulang slot ini</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(shot)}
                      aria-label="Hapus jepretan"
                    >
                      <Trash2 />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Hapus dari sesi</TooltipContent>
                </Tooltip>
              </div>
            </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
