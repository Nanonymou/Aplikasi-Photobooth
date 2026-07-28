"use client";

import { useEffect, useState } from "react";
import { Check, Download, Loader2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DEFAULT_PRESET_ID,
  downloadBlob,
  EXPORT_FORMATS,
  formatBytes,
  getExportFormat,
  getQualityPreset,
  planExport,
  QUALITY_PRESETS,
  renderExport,
  renderPreview,
  type ExportFormat,
} from "@/lib/editor/export";
import { transparencyCheckerDataUri } from "@/lib/editor/patterns";
import { cn } from "@/lib/utils";
import { useActivePage, useEditorStore } from "@/store/editor-store";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Ekspor gagal.";
}

/**
 * The export sheet.
 *
 * Split out of the dialog wrapper so it mounts fresh every time the dialog
 * opens: the preview is a snapshot of the canvas as it is right now, and the
 * format/quality choices should not carry over from a session ago.
 */
function ExportSheet({ onClose }: { onClose: () => void }) {
  const page = useActivePage();
  const title = useEditorStore((state) => state.project.title);

  const [format, setFormat] = useState<ExportFormat>("png");
  const [presetId, setPresetId] = useState(DEFAULT_PRESET_ID);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const definition = getExportFormat(format);
  const preset = getQualityPreset(presetId);
  const plan = planExport(page, format, preset.scale);

  // Rasterising the stage is async (the crop goes through an Image), so the
  // preview cannot be computed during render. It is redone per format because
  // formats without alpha get composited over white.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const url = await renderPreview(page, format);
        if (!cancelled) setPreview(url);
      } catch (cause) {
        if (!cancelled) setError(errorMessage(cause));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, format]);

  async function handleDownload() {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const result = await renderExport(page, title, format, preset.scale);
      downloadBlob(result.blob, result.filename);
      setSaved(`${result.filename} · ${formatBytes(result.blob.size)}`);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  const losesTransparency =
    page.background.type === "transparent" && !definition.supportsTransparency;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Ekspor</DialogTitle>
        <DialogDescription className="tabular-nums">
          {page.name} · {page.width}×{page.height} px
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium">Format</p>
            <ToggleGroup
              type="single"
              variant="outline"
              value={format}
              onValueChange={(value) => {
                if (!value) return;
                setFormat(value as ExportFormat);
                setSaved(null);
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
            <p className="text-xs font-medium">Kualitas</p>
            <div className="grid grid-cols-2 gap-1.5">
              {QUALITY_PRESETS.map((item) => {
                const size = planExport(page, format, item.scale);
                const active = item.id === presetId;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPresetId(item.id);
                      setSaved(null);
                    }}
                    aria-pressed={active}
                    className={cn(
                      "flex flex-col rounded-lg border px-2.5 py-2 text-left transition-colors",
                      "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
                      active
                        ? "border-primary bg-primary/10"
                        : "border-editor-border hover:border-primary/60 hover:bg-accent",
                    )}
                  >
                    <span className="text-xs font-medium">
                      {item.label}{" "}
                      <span className="text-muted-foreground font-normal">
                        {item.hint}
                      </span>
                    </span>
                    <span className="text-muted-foreground text-[10px] tabular-nums">
                      {size.width}×{size.height} px
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

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

        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium">Pratinjau</p>
          <div
            className="border-editor-border flex min-h-32 flex-1 items-center justify-center overflow-hidden rounded-lg border p-2"
            style={{
              backgroundImage: `url("${transparencyCheckerDataUri()}")`,
            }}
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- canvas data URL, no loader involved
              <img
                src={preview}
                alt="Pratinjau hasil ekspor"
                className="max-h-40 max-w-full object-contain shadow-sm"
              />
            ) : (
              <Loader2 className="text-muted-foreground size-4 animate-spin" />
            )}
          </div>
        </div>
      </div>

      {losesTransparency && (
        <p className="text-muted-foreground flex items-start gap-1.5 text-[11px] leading-relaxed">
          <TriangleAlert className="mt-0.5 size-3 shrink-0" />
          {definition.label} tidak menyimpan transparansi — latar halaman akan
          menjadi putih.
        </p>
      )}

      {error && (
        <p className="text-destructive flex items-start gap-1.5 text-[11px] leading-relaxed">
          <TriangleAlert className="mt-0.5 size-3 shrink-0" />
          {error}
        </p>
      )}

      <DialogFooter className="sm:items-center sm:justify-between">
        <p className="text-muted-foreground min-h-4 text-[11px] tabular-nums">
          {saved ? (
            <span className="text-foreground flex items-center gap-1.5">
              <Check className="size-3" />
              {saved}
            </span>
          ) : (
            `${plan.width}×${plan.height} px · ${definition.label}`
          )}
        </p>

        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Tutup
          </Button>
          <Button size="sm" onClick={handleDownload} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Download />}
            {busy ? "Menyiapkan…" : "Unduh"}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

export function ExportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <ExportSheet onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
