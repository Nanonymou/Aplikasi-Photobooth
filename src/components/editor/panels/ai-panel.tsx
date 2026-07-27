"use client";

import { motion, useReducedMotion } from "motion/react";
import { Check, LoaderCircle, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAiJob } from "@/hooks/use-ai-job";
import { useSelectedObjects } from "@/hooks/use-selected-objects";
import { AI_TOOLS, type AiTool } from "@/lib/editor/ai-tools";
import { cn } from "@/lib/utils";
import { useActivePage } from "@/store/editor-store";
import type { PhotoSlotObject } from "@/types/editor";

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
  onRun,
}: {
  tool: AiTool;
  disabled: boolean;
  active: boolean;
  progress: number;
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
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={disabled}
          onClick={onRun}
        >
          Jalankan · ±{tool.estimatedSeconds}s
        </Button>
      )}
    </li>
  );
}

/**
 * AI toolbox.
 *
 * The tools are wired to a job runner but do not transform pixels yet — each
 * enhancement lands in its own task, and the provider call is backend work.
 * Running one here walks the real progress states so the flow can be tried end
 * to end.
 */
export function AiPanel() {
  const { job, run, reset } = useAiJob();

  const slot =
    useSelectedObjects().find(
      (object): object is PhotoSlotObject =>
        object.kind === "slot" && !!object.photo,
    ) ?? null;

  const busy = job.status === "running";

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
              onRun={() =>
                run(tool.id, tool.estimatedSeconds, () => {
                  // Each tool's actual edit is added with its own task.
                })
              }
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
        Pemrosesan masih disimulasikan. Panggilan ke penyedia AI dipasang pada
        tugas backend; alat-alat di atas sudah memakai alur kerja yang sama.
      </p>
    </div>
  );
}
