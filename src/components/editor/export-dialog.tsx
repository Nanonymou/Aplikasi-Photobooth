"use client";

import { useEffect, useState } from "react";
import { Check, Download, Loader2, TriangleAlert } from "lucide-react";

import { ExportOptions } from "@/components/editor/export-options";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  defaultExportSettings,
  downloadBlob,
  formatBytes,
  getExportFormat,
  planExport,
  renderExport,
  renderPreview,
  type ExportSettings,
} from "@/lib/editor/export";
import { transparencyCheckerDataUri } from "@/lib/editor/patterns";
import { useActivePage, useEditorStore } from "@/store/editor-store";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Ekspor gagal.";
}

/**
 * The export sheet.
 *
 * Split out of the dialog wrapper so it mounts fresh every time the dialog
 * opens: the preview is a snapshot of the canvas as it is right now, and the
 * download options should not carry over from a session ago.
 */
function ExportSheet({ onClose }: { onClose: () => void }) {
  const page = useActivePage();
  const title = useEditorStore((state) => state.project.title);

  const [settings, setSettings] = useState<ExportSettings>(
    defaultExportSettings,
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const definition = getExportFormat(settings.format);
  const plan = planExport(page, settings);

  // Rasterising the stage is async (the crop goes through an Image), so the
  // preview cannot be computed during render. Only the two settings that change
  // what the picture looks like are watched — scale and quality do not.
  const previewFormat = settings.format;
  const previewTransparent = settings.transparent;
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const url = await renderPreview(page, {
          ...defaultExportSettings(),
          format: previewFormat,
          transparent: previewTransparent,
        });
        if (!cancelled) setPreview(url);
      } catch (cause) {
        if (!cancelled) setError(errorMessage(cause));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, previewFormat, previewTransparent]);

  async function handleDownload() {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const result = await renderExport(page, title, settings);
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
        <ExportOptions
          page={page}
          settings={settings}
          onChange={(next) => {
            setSettings(next);
            setSaved(null);
          }}
        />

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
                className="max-h-56 max-w-full object-contain shadow-sm"
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
