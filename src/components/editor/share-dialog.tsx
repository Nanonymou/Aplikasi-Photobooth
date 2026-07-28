"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Info,
  Loader2,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  downloadBlob,
  formatBytes,
  getQualityPreset,
  renderExport,
} from "@/lib/editor/export";
import {
  mockQrModules,
  shareLink,
  shareMessage,
  SHARE_TARGETS,
} from "@/lib/editor/share";
import { useActivePage, useEditorStore } from "@/store/editor-store";

const QR_SIZE = 25;

/** Draws a module grid as one path so the SVG stays small. */
function QrPreview({ value }: { value: string }) {
  const path = useMemo(() => {
    const modules = mockQrModules(value, QR_SIZE);
    let data = "";
    modules.forEach((row, y) => {
      row.forEach((filled, x) => {
        if (filled) data += `M${x} ${y}h1v1h-1z`;
      });
    });
    return data;
  }, [value]);

  return (
    <svg
      viewBox={`-2 -2 ${QR_SIZE + 4} ${QR_SIZE + 4}`}
      className="size-full"
      role="img"
      aria-label="Pratinjau QR Code"
    >
      <rect
        x={-2}
        y={-2}
        width={QR_SIZE + 4}
        height={QR_SIZE + 4}
        fill="#ffffff"
      />
      <path d={path} fill="#0f172a" shapeRendering="crispEdges" />
    </svg>
  );
}

function ShareSheet({ onClose }: { onClose: () => void }) {
  const page = useActivePage();
  const projectId = useEditorStore((state) => state.project.id);
  const title = useEditorStore((state) => state.project.title);

  const link = shareLink(projectId);
  const message = shareMessage(title);

  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setError(null);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Browser menolak akses papan klip — salin tautannya manual.");
    }
  }

  /** Quick hand-off: an HD PNG is what people actually attach to a chat. */
  async function downloadForSharing() {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const result = await renderExport(
        page,
        title,
        "png",
        getQualityPreset("hd").scale,
      );
      downloadBlob(result.blob, result.filename);
      setSaved(`${result.filename} · ${formatBytes(result.blob.size)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ekspor gagal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Bagikan cepat</DialogTitle>
        <DialogDescription>
          Tautan dan QR untuk galeri hasil foto ini.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
        <figure className="flex flex-col items-center gap-1.5">
          <div className="border-editor-border w-full overflow-hidden rounded-lg border bg-white p-2">
            <QrPreview value={link} />
          </div>
          <figcaption className="text-muted-foreground text-center text-[10px] leading-relaxed">
            Contoh tampilan QR
          </figcaption>
        </figure>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" htmlFor="share-link">
              Tautan galeri
            </label>
            <div className="flex gap-1.5">
              <Input
                id="share-link"
                readOnly
                value={link}
                onFocus={(event) => event.currentTarget.select()}
                className="h-8 text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={copyLink}
                aria-label="Salin tautan"
              >
                {copied ? <Check /> : <Copy />}
                {copied ? "Tersalin" : "Salin"}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium">Kirim ke</p>
            <div className="grid grid-cols-2 gap-1.5">
              {SHARE_TARGETS.map((target) => (
                <Button
                  key={target.id}
                  asChild
                  variant="outline"
                  size="sm"
                  className="justify-between"
                >
                  <a
                    href={target.href(link, message)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {target.label}
                    <ExternalLink className="opacity-60" />
                  </a>
                </Button>
              ))}
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={downloadForSharing}
            disabled={busy}
          >
            {busy ? <Loader2 className="animate-spin" /> : <Download />}
            {busy ? "Menyiapkan…" : "Unduh gambar (PNG HD)"}
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground flex items-start gap-1.5 text-[11px] leading-relaxed">
        <Info className="mt-0.5 size-3 shrink-0" />
        Tautan dan QR masih contoh. Keduanya jadi nyata setelah layanan unggah
        aktif — unduhan gambar di atas sudah berjalan penuh.
      </p>

      {error && (
        <p className="text-destructive flex items-start gap-1.5 text-[11px] leading-relaxed">
          <TriangleAlert className="mt-0.5 size-3 shrink-0" />
          {error}
        </p>
      )}

      <DialogFooter className="sm:items-center sm:justify-between">
        <p className="text-muted-foreground min-h-4 text-[11px] tabular-nums">
          {saved && (
            <span className="text-foreground flex items-center gap-1.5">
              <Check className="size-3" />
              {saved}
            </span>
          )}
        </p>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Tutup
        </Button>
      </DialogFooter>
    </>
  );
}

export function ShareDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <ShareSheet onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
