"use client";

import { Check } from "lucide-react";

import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  clampScale,
  EXPORT_FORMATS,
  formatBytes,
  getExportFormat,
  isLossy,
  matchingPresetId,
  MAX_SCALE,
  MIN_SCALE,
  planExport,
  QUALITY_PRESETS,
  type ExportFormat,
  type ExportSettings,
} from "@/lib/editor/export";
import { cn } from "@/lib/utils";
import type { CanvasPage } from "@/types/editor";

const cardClass =
  "rounded-lg border px-2.5 py-2 text-left transition-colors outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]";
const cardIdle =
  "border-editor-border hover:border-primary/60 hover:bg-accent";
const cardActive = "border-primary bg-primary/10";

/**
 * Download options: format, resolution, and the knobs each format actually has.
 *
 * Kept apart from the dialog so the same panel can sit in a sheet, a drawer, or
 * the kiosk flow later — it owns no state of its own, only the settings object
 * it is handed.
 */
export function ExportOptions({
  page,
  settings,
  onChange,
}: {
  page: Pick<CanvasPage, "width" | "height">;
  settings: ExportSettings;
  onChange: (next: ExportSettings) => void;
}) {
  const definition = getExportFormat(settings.format);
  const plan = planExport(page, settings);
  const activePreset = matchingPresetId(settings.scale);

  function patch(next: Partial<ExportSettings>) {
    onChange({ ...settings, ...next });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium">Format</p>
        <ToggleGroup
          type="single"
          variant="outline"
          value={settings.format}
          onValueChange={(value) => {
            if (!value) return;
            patch({ format: value as ExportFormat });
          }}
          className="w-full"
        >
          {EXPORT_FORMATS.map((item) => (
            <ToggleGroupItem
              key={item.id}
              value={item.id}
              aria-label={item.label}
              className="flex-1"
            >
              {item.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          {definition.hint}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium">Resolusi</p>
        <div className="grid grid-cols-2 gap-1.5">
          {QUALITY_PRESETS.map((preset) => {
            const size = planExport(page, { ...settings, scale: preset.scale });
            const active = preset.id === activePreset;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => patch({ scale: preset.scale })}
                aria-pressed={active}
                className={cn(
                  cardClass,
                  "flex flex-col",
                  active ? cardActive : cardIdle,
                )}
              >
                <span className="text-xs font-medium">
                  {preset.label}{" "}
                  <span className="text-muted-foreground font-normal">
                    {preset.hint}
                  </span>
                </span>
                <span className="text-muted-foreground text-[10px] tabular-nums">
                  {size.width}×{size.height} px
                </span>
              </button>
            );
          })}
        </div>

        {/* Free scale, for the sizes between the presets (e.g. a 3× reprint). */}
        <div className="mt-1 flex items-center gap-2.5">
          <span className="text-muted-foreground w-10 shrink-0 text-[11px]">
            Skala
          </span>
          <Slider
            value={[settings.scale]}
            min={MIN_SCALE}
            max={MAX_SCALE}
            step={0.25}
            onValueChange={([value]) => patch({ scale: clampScale(value) })}
            aria-label="Skala ekspor"
            className="flex-1"
          />
          <span className="w-24 shrink-0 text-right text-[11px] tabular-nums">
            {settings.scale}× ·{" "}
            <span className="text-muted-foreground">
              {plan.width}×{plan.height}
            </span>
          </span>
        </div>
      </div>

      {(isLossy(settings.format) || definition.supportsTransparency) && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium">Opsi {definition.label}</p>

          {isLossy(settings.format) && (
            <div className="flex items-center gap-2.5">
              <span className="text-muted-foreground w-10 shrink-0 text-[11px]">
                Mutu
              </span>
              <Slider
                value={[settings.quality]}
                min={0.4}
                max={1}
                step={0.02}
                onValueChange={([value]) => patch({ quality: value })}
                aria-label="Mutu kompresi"
                className="flex-1"
              />
              <span className="w-24 shrink-0 text-right text-[11px] tabular-nums">
                {Math.round(settings.quality * 100)}%
              </span>
            </div>
          )}

          {definition.supportsTransparency && (
            <button
              type="button"
              onClick={() => patch({ transparent: !settings.transparent })}
              aria-pressed={settings.transparent}
              className={cn(
                cardClass,
                "flex items-center justify-between gap-2",
                settings.transparent ? cardActive : cardIdle,
              )}
            >
              <span className="text-xs font-medium">Latar transparan</span>
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded border",
                  settings.transparent
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-editor-border",
                )}
              >
                {settings.transparent && <Check className="size-3" />}
              </span>
            </button>
          )}
        </div>
      )}

      <dl className="border-editor-border bg-editor-surface grid grid-cols-2 gap-y-1 rounded-lg border p-3 text-[11px]">
        <dt className="text-muted-foreground">Ukuran file</dt>
        <dd className="text-right tabular-nums">
          ± {formatBytes(plan.estimatedBytes)}
        </dd>
        <dt className="text-muted-foreground">Ukuran cetak</dt>
        <dd className="text-right tabular-nums">
          {plan.printWidthCm.toFixed(1)} × {plan.printHeightCm.toFixed(1)} cm
        </dd>
      </dl>
    </div>
  );
}
