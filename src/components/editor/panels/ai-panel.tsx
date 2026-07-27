"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Check,
  Eye,
  LoaderCircle,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { useAiJob } from "@/hooks/use-ai-job";
import { useSelectedObjects } from "@/hooks/use-selected-objects";
import { AI_TOOLS, type AiTool } from "@/lib/editor/ai-tools";
import { removeBackgroundApprox } from "@/lib/editor/background-removal";
import {
  autoColorCorrectApprox,
  enhanceFaceApprox,
} from "@/lib/editor/image-adjust";
import { cn } from "@/lib/utils";
import { useActivePage, useEditorStore } from "@/store/editor-store";
import type { PhotoSlotObject } from "@/types/editor";

/** Starting strength for tools with an intensity dial. */
const DEFAULT_INTENSITY = 0.6;

/** What the tools will act on, and whether that is currently possible. */
function TargetSummary({ slot }: { slot: PhotoSlotObject | null }) {
  const page = useActivePage();
  const withPhoto = page.objects.filter(
    (object) => object.kind === "slot" && object.photo,
  ).length;

  if (slot) {
    return (
      <div className="border-editor-border flex items-center gap-3 rounded-lg border p-2.5">
        {/* A data URL or local sample; next/image would only add a round-trip. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={slot.photo!.src}
          alt=""
          className="border-editor-border size-10 shrink-0 rounded border object-cover"
        />
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">{slot.name}</p>
          <p className="text-muted-foreground text-[11px]">
            Alat akan diterapkan ke foto ini
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-editor-border text-muted-foreground rounded-lg border border-dashed p-3 text-xs leading-relaxed">
      {withPhoto === 0
        ? "Belum ada foto di halaman ini. Ambil foto dulu lewat panel Foto."
        : "Pilih slot foto di kanvas untuk memakai alat yang bekerja pada satu foto."}
    </div>
  );
}

function ToolRow({
  tool,
  disabled,
  active,
  progress,
  intensity,
  onIntensityChange,
  onRun,
}: {
  tool: AiTool;
  disabled: boolean;
  active: boolean;
  progress: number;
  intensity: number;
  onIntensityChange: (value: number) => void;
  onRun: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const Icon = tool.icon;

  return (
    <li className="border-editor-border flex flex-col gap-2 rounded-lg border p-2.5">
      <div className="flex items-start gap-2.5">
        <span className="bg-editor-surface text-muted-foreground mt-0.5 flex size-7 shrink-0 items-center justify-center rounded">
          <Icon className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium">{tool.label}</p>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            {tool.description}
          </p>
        </div>
      </div>

      {active ? (
        <div className="flex flex-col gap-1.5">
          <div className="bg-editor-surface h-1.5 overflow-hidden rounded-full">
            <motion.div
              className="bg-primary h-full rounded-full"
              initial={false}
              animate={{ width: `${Math.round(progress * 100)}%` }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.15 }}
            />
          </div>
          <p className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
            <LoaderCircle className="size-3 animate-spin" />
            Memproses… {Math.round(progress * 100)}%
          </p>
        </div>
      ) : (
        <>
          {tool.hasIntensity && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px]">
                  Intensitas
                </span>
                <span className="text-muted-foreground text-[11px] tabular-nums">
                  {Math.round(intensity * 100)}%
                </span>
              </div>
              <Slider
                value={[Math.round(intensity * 100)]}
                min={0}
                max={100}
                step={5}
                disabled={disabled}
                onValueChange={([value]) => onIntensityChange(value / 100)}
                aria-label={`Intensitas ${tool.label}`}
              />
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={disabled}
            onClick={onRun}
          >
            Jalankan · ±{tool.estimatedSeconds}s
          </Button>
        </>
      )}
    </li>
  );
}

/**
 * AI toolbox.
 *
 * Background removal already produces a real transparent PNG (via a local
 * approximation); the remaining enhancements land in their own tasks. All of
 * them share the same job runner, so progress, failure and revert behave
 * identically whichever one is wired up.
 */
export function AiPanel() {
  const { job, run, reset } = useAiJob();
  const setSlotPhoto = useEditorStore((state) => state.setSlotPhoto);
  // Per-tool strength, remembered across runs within the session.
  const [intensities, setIntensities] = useState<Record<string, number>>({});
  const updateObjects = useEditorStore((state) => state.updateObjects);
  // Holds the enhanced source while the original is being peeked at, so it can
  // be put back on release.
  const [peeking, setPeeking] = useState<string | null>(null);

  const slot =
    useSelectedObjects().find(
      (object): object is PhotoSlotObject =>
        object.kind === "slot" && !!object.photo,
    ) ?? null;

  const busy = job.status === "running";
  const edited = !!slot?.photo?.originalSrc;

  /** What each tool does once its job finishes. */
  function applyTool(tool: AiTool): () => void | Promise<void> {
    if (tool.id === "remove-background" && slot?.photo) {
      const photo = slot.photo;
      return async () => {
        const cutout = await removeBackgroundApprox(photo.src);
        setSlotPhoto(slot.id, {
          ...photo,
          src: cutout,
          // Keep the first original across repeated runs.
          originalSrc: photo.originalSrc ?? photo.src,
        });
      };
    }

    if (tool.id === "enhance-face" && slot?.photo) {
      const photo = slot.photo;
      const strength = intensities[tool.id] ?? DEFAULT_INTENSITY;
      return async () => {
        const enhanced = await enhanceFaceApprox(photo.src, strength);
        setSlotPhoto(slot.id, {
          ...photo,
          src: enhanced,
          originalSrc: photo.originalSrc ?? photo.src,
        });
      };
    }

    if (tool.id === "color-correct" && slot?.photo) {
      const photo = slot.photo;
      return async () => {
        const corrected = await autoColorCorrectApprox(photo.src);
        setSlotPhoto(slot.id, {
          ...photo,
          src: corrected,
          originalSrc: photo.originalSrc ?? photo.src,
        });
      };
    }

    // Every other enhancement lands in its own task.
    return () => {};
  }

  /** Swaps the slot to the original while held, without touching history. */
  function showOriginal(show: boolean) {
    const photo = slot?.photo;
    if (!slot || !photo?.originalSrc) return;

    if (show) {
      if (peeking) return;
      setPeeking(photo.src);
      updateObjects([
        { id: slot.id, patch: { photo: { ...photo, src: photo.originalSrc } } },
      ]);
      return;
    }

    if (!peeking) return;
    updateObjects([{ id: slot.id, patch: { photo: { ...photo, src: peeking } } }]);
    setPeeking(null);
  }

  function revert() {
    if (!slot?.photo?.originalSrc) return;
    setSlotPhoto(slot.id, {
      ...slot.photo,
      src: slot.photo.originalSrc,
      originalSrc: null,
    });
    reset();
  }

  return (
    <div className="flex flex-col gap-3">
      <TargetSummary slot={slot} />

      {job.status === "done" && (
        <p className="text-primary flex items-center gap-1.5 text-[11px]">
          <Check className="size-3" />
          {job.message}
        </p>
      )}
      {job.status === "error" && (
        <p className="text-destructive flex items-center gap-1.5 text-[11px]">
          <TriangleAlert className="size-3" />
          {job.message}
        </p>
      )}

      {edited && slot?.photo?.originalSrc && (
        <div className="border-editor-border flex flex-col gap-2 rounded-lg border p-2.5">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["Sebelum", slot.photo.originalSrc],
                ["Sesudah", peeking ?? slot.photo.src],
              ] as const
            ).map(([label, src]) => (
              <figure key={label} className="flex flex-col gap-1">
                {/* Data URLs; next/image would only add a loader round-trip. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`${label} perbaikan`}
                  className="border-editor-border aspect-square w-full rounded border object-cover"
                />
                <figcaption className="text-muted-foreground text-center text-[10px]">
                  {label}
                </figcaption>
              </figure>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            // Hold to compare: the swap is a transient update, so peeking at the
            // original never lands in the undo history.
            onPointerDown={() => showOriginal(true)}
            onPointerUp={() => showOriginal(false)}
            onPointerLeave={() => showOriginal(false)}
            onKeyDown={(event) => {
              if (event.key === " " || event.key === "Enter") showOriginal(true);
            }}
            onKeyUp={() => showOriginal(false)}
          >
            <Eye />
            Tahan untuk lihat aslinya
          </Button>

          <Button variant="ghost" size="sm" onClick={revert} disabled={busy}>
            <RotateCcw />
            Kembalikan foto asli
          </Button>
        </div>
      )}

      <Separator />

      <ul className="flex flex-col gap-2">
        {AI_TOOLS.map((tool) => {
          const needsPhoto = tool.target === "photo";
          const active = busy && job.toolId === tool.id;

          return (
            <ToolRow
              key={tool.id}
              tool={tool}
              disabled={busy || (needsPhoto && !slot)}
              active={active}
              progress={active ? job.progress : 0}
              intensity={intensities[tool.id] ?? DEFAULT_INTENSITY}
              onIntensityChange={(value) =>
                setIntensities((current) => ({ ...current, [tool.id]: value }))
              }
              onRun={() => run(tool.id, tool.estimatedSeconds, applyTool(tool))}
            />
          );
        })}
      </ul>

      {busy && (
        <Button variant="ghost" size="sm" onClick={reset}>
          Batalkan
        </Button>
      )}

      <p
        className={cn(
          "border-editor-border text-muted-foreground rounded-lg border border-dashed p-3 text-[11px] leading-relaxed",
        )}
      >
        Hapus latar belakang memakai perkiraan lokal: warna di keempat sudut
        dianggap latar lalu dibuat transparan. Hasilnya PNG ber-alpha sungguhan,
        tapi belum mengenali orang — model AI-nya dipasang pada tugas backend.
      </p>
    </div>
  );
}
