"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { useSelectedObjects } from "@/hooks/use-selected-objects";
import {
  buildSingleSlot,
  buildSlotGrid,
  DEFAULT_FRAME_OPTIONS,
  FRAME_PRESETS,
  type FrameLayoutOptions,
} from "@/lib/editor/frame-layouts";
import { SLOT_SHAPES, slotPathData } from "@/lib/editor/slot-shape";
import { cn } from "@/lib/utils";
import { useActivePage, useEditorStore } from "@/store/editor-store";
import type { CanvasPage, SlotShape } from "@/types/editor";

function PanelSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs">{label}</span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Kurangi ${label}`}
        >
          <Minus />
        </Button>
        <span className="w-6 text-center text-xs font-medium tabular-nums">
          {value}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Tambah ${label}`}
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "px",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs">{label}</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {Math.round(value)}
          {suffix}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([next]) => onChange(next)}
        aria-label={label}
      />
    </div>
  );
}

/** Small SVG rendering of a shape, used by the shape picker. */
function ShapePreview({ shape }: { shape: SlotShape }) {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
      <path
        d={slotPathData(shape, 24, 24, shape === "rect" ? 5 : 0)}
        fill="currentColor"
      />
    </svg>
  );
}

/** Live preview of the frame the current settings would produce. */
function LayoutPreview({
  page,
  options,
}: {
  page: CanvasPage;
  options: FrameLayoutOptions;
}) {
  const slots = useMemo(
    () => buildSlotGrid(page, options),
    [page, options],
  );

  return (
    <div className="bg-editor-surface border-editor-border flex justify-center rounded-lg border p-3">
      <svg
        viewBox={`0 0 ${page.width} ${page.height}`}
        className="max-h-40 w-auto"
        style={{ aspectRatio: `${page.width} / ${page.height}` }}
        role="img"
        aria-label={`Pratinjau ${slots.length} slot foto`}
      >
        <rect width={page.width} height={page.height} rx={16} fill="#ffffff" />
        {slots.map((slot) => (
          <path
            key={slot.id}
            d={slotPathData(
              slot.shape,
              slot.width,
              slot.height,
              slot.cornerRadius,
            )}
            transform={`translate(${slot.x} ${slot.y})`}
            fill="#c4b5fd"
            stroke="#7c3aed"
            strokeWidth={6}
          />
        ))}
      </svg>
    </div>
  );
}

/**
 * The dynamic frame builder: choose how many photo slots the page has, what
 * shape they are, and how they sit on the page — no fixed templates.
 */
export function FramePanel() {
  const page = useActivePage();
  const replaceSlots = useEditorStore((state) => state.replaceSlots);
  const addObject = useEditorStore((state) => state.addObject);
  const updateObjects = useEditorStore((state) => state.updateObjects);
  const beginInteraction = useEditorStore((state) => state.beginInteraction);
  const endInteraction = useEditorStore((state) => state.endInteraction);

  const [options, setOptions] = useState<FrameLayoutOptions>(
    DEFAULT_FRAME_OPTIONS,
  );

  const selectedSlots = useSelectedObjects().filter(
    (object) => object.kind === "slot",
  );
  const slotCount = page.objects.filter(
    (object) => object.kind === "slot",
  ).length;

  const patch = (next: Partial<FrameLayoutOptions>) =>
    setOptions((current) => ({ ...current, ...next }));

  function applyLayout() {
    // Photos already taken are carried over to the new slots, in order.
    const existingPhotos = page.objects
      .filter((object) => object.kind === "slot")
      .map((slot) => slot.photo);

    replaceSlots(buildSlotGrid(page, options, existingPhotos));
  }

  function applyStyleToSelection() {
    beginInteraction();
    updateObjects(
      selectedSlots.map((slot) => ({
        id: slot.id,
        patch: {
          shape: options.shape,
          cornerRadius: options.cornerRadius,
          borderWidth: options.borderWidth,
        },
      })),
    );
    endInteraction();
  }

  return (
    <div className="flex flex-col gap-5">
      <PanelSection title="Tata letak siap pakai">
        <div className="grid grid-cols-2 gap-2">
          {FRAME_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              variant="outline"
              size="sm"
              className="justify-start"
              onClick={() =>
                patch({
                  rows: preset.rows,
                  cols: preset.cols,
                  shape: preset.shape,
                  gap: preset.gap,
                  margin: preset.margin,
                })
              }
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </PanelSection>

      <LayoutPreview page={page} options={options} />

      <PanelSection title={`Jumlah slot — ${options.rows * options.cols}`}>
        <Stepper
          label="Baris"
          value={options.rows}
          min={1}
          max={12}
          onChange={(rows) => patch({ rows })}
        />
        <Stepper
          label="Kolom"
          value={options.cols}
          min={1}
          max={8}
          onChange={(cols) => patch({ cols })}
        />
      </PanelSection>

      <Separator />

      <PanelSection title="Bentuk slot">
        <div className="grid grid-cols-4 gap-2">
          {SLOT_SHAPES.map((shape) => (
            <button
              key={shape.id}
              type="button"
              onClick={() => patch({ shape: shape.id })}
              aria-pressed={options.shape === shape.id}
              title={shape.label}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border transition-colors",
                "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
                options.shape === shape.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-editor-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <ShapePreview shape={shape.id} />
              <span className="text-[9px] leading-none">{shape.label}</span>
            </button>
          ))}
        </div>
      </PanelSection>

      <Separator />

      <PanelSection title="Susunan">
        <SliderField
          label="Jarak antar slot"
          value={options.gap}
          min={0}
          max={200}
          onChange={(gap) => patch({ gap })}
        />
        <SliderField
          label="Margin halaman"
          value={options.margin}
          min={0}
          max={300}
          onChange={(margin) => patch({ margin })}
        />
        <SliderField
          label="Sudut membulat"
          value={options.cornerRadius}
          min={0}
          max={120}
          onChange={(cornerRadius) => patch({ cornerRadius })}
        />
        <SliderField
          label="Tebal bingkai"
          value={options.borderWidth}
          min={0}
          max={40}
          onChange={(borderWidth) => patch({ borderWidth })}
        />
      </PanelSection>

      <Separator />

      <div className="flex flex-col gap-2">
        <Button onClick={applyLayout}>
          <Sparkles />
          Terapkan tata letak
        </Button>
        <Button
          variant="outline"
          onClick={() => addObject(buildSingleSlot(page, options, slotCount))}
        >
          <Plus />
          Tambah 1 slot
        </Button>
        {selectedSlots.length > 0 && (
          <Button variant="secondary" onClick={applyStyleToSelection}>
            Terapkan gaya ke {selectedSlots.length} slot terpilih
          </Button>
        )}
      </div>

      <p className="text-muted-foreground text-xs leading-relaxed">
        &ldquo;Terapkan tata letak&rdquo; mengganti seluruh slot foto di halaman
        ini. Teks dan stiker tetap aman, dan foto yang sudah diambil dipindahkan
        ke slot baru sesuai urutan.
      </p>
    </div>
  );
}
