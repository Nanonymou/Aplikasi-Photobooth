"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Info,
  Loader2,
  Share2,
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
import { Textarea } from "@/components/ui/textarea";
import {
  defaultExportSettings,
  downloadBlob,
  formatBytes,
  getQualityPreset,
  renderExport,
} from "@/lib/editor/export";
import {
  canShareFile,
  mockQrModules,
  shareCaption,
  shareFile,
  shareLink,
  SHARE_TARGETS,
  type ShareTarget,
} from "@/lib/editor/share";
import { cn } from "@/lib/utils";
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

const neverChanges = () => () => {};

/**
 * Whether the browser has a system share sheet.
 *
 * Read through `useSyncExternalStore` so the server render agrees with the
 * first client render — reading `navigator` during render would not.
 */
function useNativeShare(): boolean {
  return useSyncExternalStore(
    neverChanges,
    () => typeof navigator.share === "function",
    () => false,
  );
}

/** HD PNG is what every platform accepts and what people expect to receive. */
async function renderSharePng(
  page: Parameters<typeof renderExport>[0],
  title: string,
) {
  return renderExport(page, title, {
    ...defaultExportSettings(),
    format: "png",
    scale: getQualityPreset("hd").scale,
  });
}

function ShareSheet({ onClose }: { onClose: () => void }) {
  const page = useActivePage();
  const projectId = useEditorStore((state) => state.project.id);
  const title = useEditorStore((state) => state.project.title);
  const nativeShare = useNativeShare();

  const link = shareLink(projectId);
  const [caption, setCaption] = useState(() => shareCaption(title));
  const [copied, setCopied] = useState<"link" | "caption" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function copy(text: string, what: "link" | "caption") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setError(null);
      setTimeout(() => setCopied(null), 2000);
      return true;
    } catch {
      setError("Browser menolak akses papan klip — salin teksnya manual.");
      return false;
    }
  }

  /**
   * Instagram and TikTok cannot be handed a picture from the web, so the button
   * does the two steps a person would otherwise do by hand — save the image,
   * copy the caption — and then opens the app.
   */
  async function handleManual(target: ShareTarget) {
    setBusy(target.id);
    setError(null);
    setStatus(null);
    try {
      const result = await renderSharePng(page, title);
      downloadBlob(result.blob, result.filename);
      await copy(caption, "caption");
      window.open(target.href(link, caption), "_blank", "noopener,noreferrer");
      setStatus(target.hint ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ekspor gagal.");
    } finally {
      setBusy(null);
    }
  }

  /** System share sheet, the only path that can pass the actual file along. */
  async function handleNativeShare() {
    setBusy("native");
    setError(null);
    setStatus(null);
    try {
      const result = await renderSharePng(page, title);
      const file = new File([result.blob], result.filename, {
        type: "image/png",
      });

      if (canShareFile(file)) {
        const shared = await shareFile(file, title, `${caption} ${link}`);
        setStatus(shared ? "Terkirim lewat menu berbagi perangkat." : null);
        return;
      }

      // No file support: share the text, and save the picture separately so the
      // user still has something to attach.
      await navigator.share({ title, text: `${caption} ${link}` });
      downloadBlob(result.blob, result.filename);
      setStatus("Teks dibagikan, gambar tersimpan di unduhan.");
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : "Berbagi gagal.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDownload() {
    setBusy("download");
    setError(null);
    setStatus(null);
    try {
      const result = await renderSharePng(page, title);
      downloadBlob(result.blob, result.filename);
      setStatus(`${result.filename} · ${formatBytes(result.blob.size)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ekspor gagal.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Bagikan cepat</DialogTitle>
        <DialogDescription>
          Kirim hasil foto ini ke aplikasi lain, atau bagikan tautan galerinya.
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
                onClick={() => copy(link, "link")}
                aria-label="Salin tautan"
              >
                {copied === "link" ? <Check /> : <Copy />}
                {copied === "link" ? "Tersalin" : "Salin"}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium" htmlFor="share-caption">
                Caption
              </label>
              <button
                type="button"
                onClick={() => copy(caption, "caption")}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex items-center gap-1 rounded text-[11px] outline-none focus-visible:ring-[3px]"
              >
                {copied === "caption" ? (
                  <Check className="size-3" />
                ) : (
                  <Copy className="size-3" />
                )}
                {copied === "caption" ? "Tersalin" : "Salin caption"}
              </button>
            </div>
            <Textarea
              id="share-caption"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              rows={2}
              className="min-h-14 text-xs"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium">Kirim ke</p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {SHARE_TARGETS.map((target) => {
            const swatch = (
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: target.color }}
              />
            );

            if (target.mode === "manual") {
              return (
                <Button
                  key={target.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleManual(target)}
                  disabled={busy !== null}
                  className="justify-start gap-2"
                >
                  {busy === target.id ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    swatch
                  )}
                  {target.label}
                </Button>
              );
            }

            return (
              <Button
                key={target.id}
                asChild
                variant="outline"
                size="sm"
                className="justify-start gap-2"
              >
                <a
                  href={target.href(link, caption)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {swatch}
                  {target.label}
                  <ExternalLink className="ml-auto opacity-60" />
                </a>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 sm:flex-row">
        {nativeShare && (
          <Button
            size="sm"
            onClick={handleNativeShare}
            disabled={busy !== null}
            className="flex-1"
          >
            {busy === "native" ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Share2 />
            )}
            Bagikan lewat perangkat
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={handleDownload}
          disabled={busy !== null}
          className="flex-1"
        >
          {busy === "download" ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Download />
          )}
          Unduh gambar (PNG HD)
        </Button>
      </div>

      <p className="text-muted-foreground flex items-start gap-1.5 text-[11px] leading-relaxed">
        <Info className="mt-0.5 size-3 shrink-0" />
        Instagram &amp; TikTok hanya menerima unggahan dari aplikasinya, jadi
        tombolnya menyimpan gambar + menyalin caption lalu membuka aplikasi.
        Tautan dan QR sendiri masih contoh sampai layanan unggah aktif.
      </p>

      {error && (
        <p className="text-destructive flex items-start gap-1.5 text-[11px] leading-relaxed">
          <TriangleAlert className="mt-0.5 size-3 shrink-0" />
          {error}
        </p>
      )}

      <DialogFooter className="sm:items-center sm:justify-between">
        <p
          className={cn(
            "text-muted-foreground min-h-4 text-[11px]",
            status && "text-foreground",
          )}
        >
          {status && (
            <span className="flex items-center gap-1.5">
              <Check className="size-3" />
              {status}
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
