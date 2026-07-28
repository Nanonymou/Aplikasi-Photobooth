"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Download, Loader2, Maximize2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { downloadDataUrl, exportFilename } from "@/lib/editor/export";
import { shareLink } from "@/lib/editor/share";
import { useEditorStore } from "@/store/editor-store";

/** Rendered big enough to stay sharp when the card goes fullscreen. */
const QR_PIXELS = 1024;

const QR_OPTIONS = {
  // Medium recovery: survives a smudged kiosk screen without inflating the
  // module count so far that phones struggle at arm's length.
  errorCorrectionLevel: "M",
  margin: 2,
  width: QR_PIXELS,
  color: { dark: "#0f172a", light: "#ffffff" },
} as const;

export async function renderQrDataUrl(value: string): Promise<string> {
  return QRCode.toDataURL(value, QR_OPTIONS);
}

/**
 * The QR a guest scans to take their photos home.
 *
 * The code itself is real — it encodes exactly the link shown underneath it.
 * That link is still a stand-in until the upload service exists, which the
 * dialog says out loud rather than hiding behind a decorative pattern.
 */
function QrSheet({ onClose }: { onClose: () => void }) {
  const projectId = useEditorStore((state) => state.project.id);
  const title = useEditorStore((state) => state.project.title);
  const link = shareLink(projectId);

  const cardRef = useRef<HTMLDivElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const url = await renderQrDataUrl(link);
        if (!cancelled) setDataUrl(url);
      } catch {
        if (!cancelled) setError("QR Code gagal dibuat.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [link]);

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

  /** Kiosk mode: the card fills the screen so a phone can scan from a metre away. */
  async function goFullscreen() {
    const card = cardRef.current;
    if (!card) return;
    try {
      await card.requestFullscreen();
    } catch {
      setError("Layar penuh tidak didukung browser ini.");
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>QR unduhan</DialogTitle>
        <DialogDescription>
          Pindai untuk membuka galeri {title} dan mengunduh fotonya.
        </DialogDescription>
      </DialogHeader>

      <div
        ref={cardRef}
        className="flex flex-col items-center justify-center gap-3 rounded-xl bg-white p-5 text-slate-900 fullscreen:gap-6 fullscreen:p-10"
      >
        <div className="flex aspect-square w-full max-w-56 items-center justify-center fullscreen:max-w-[70vmin]">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- generated data URL, no loader involved
            <img
              src={dataUrl}
              alt={`QR Code untuk ${link}`}
              className="size-full"
            />
          ) : (
            <Loader2 className="size-5 animate-spin text-slate-400" />
          )}
        </div>

        <div className="flex flex-col items-center gap-0.5 text-center">
          <p className="text-sm font-semibold fullscreen:text-2xl">{title}</p>
          <p className="font-mono text-[11px] break-all text-slate-500 fullscreen:text-base">
            {link}
          </p>
        </div>
      </div>

      <p className="text-muted-foreground text-[11px] leading-relaxed">
        QR-nya asli dan berisi tautan di atas. Tautannya sendiri masih contoh
        sampai layanan unggah aktif.
      </p>

      {error && (
        <p className="text-destructive flex items-start gap-1.5 text-[11px] leading-relaxed">
          <TriangleAlert className="mt-0.5 size-3 shrink-0" />
          {error}
        </p>
      )}

      <DialogFooter className="sm:justify-between">
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={copyLink}>
            {copied ? <Check /> : <Copy />}
            {copied ? "Tersalin" : "Salin tautan"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              dataUrl &&
              downloadDataUrl(dataUrl, exportFilename(`${title} qr`, "png"))
            }
            disabled={!dataUrl}
          >
            <Download />
            Unduh QR
          </Button>
          <Button variant="outline" size="sm" onClick={goFullscreen}>
            <Maximize2 />
            Layar penuh
          </Button>
        </div>

        <Button variant="ghost" size="sm" onClick={onClose}>
          Tutup
        </Button>
      </DialogFooter>
    </>
  );
}

export function QrDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <QrSheet onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
