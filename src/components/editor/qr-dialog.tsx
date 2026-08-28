"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  Download,
  Loader2,
  Maximize2,
  RotateCcw,
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
import { shareExpiry, useShareLink } from "@/hooks/use-share-link";
import { downloadDataUrl, exportFilename } from "@/lib/editor/export";
import { useEditorStore } from "@/store/editor-store";
import { toast } from "@/store/toast-store";

/**
 * The QR a guest scans to take their photos home.
 *
 * Opening this dialog publishes the canvas: the picture is uploaded, the server
 * mints the short code, and the QR it draws for that address is what appears
 * here. So the code leads to the actual photo — on a phone that has never seen
 * this app — rather than to a plausible-looking address that resolves to
 * nothing.
 */
function QrSheet({ onClose }: { onClose: () => void }) {
  const title = useEditorStore((state) => state.project.title);
  const { link, create } = useShareLink();

  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Publishing is the whole point of this dialog, so it starts the moment the
  // dialog opens; `create` is a no-op once this picture already has a link.
  useEffect(() => {
    create();
  }, [create]);

  const share = link.state === "ready" ? link.share : null;

  async function copyLink() {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(share.url);
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
          Pindai untuk membuka foto {title} dan menyimpannya.
        </DialogDescription>
      </DialogHeader>

      <div
        ref={cardRef}
        className="flex flex-col items-center justify-center gap-3 rounded-xl bg-white p-5 text-slate-900 fullscreen:gap-6 fullscreen:p-10"
      >
        <div className="flex aspect-square w-full max-w-56 items-center justify-center fullscreen:max-w-[70vmin]">
          {share ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL from the API, no loader involved
            <img
              src={share.qr.dataUrl}
              alt={`QR Code untuk ${share.url}`}
              className="size-full"
            />
          ) : (
            <Loader2 className="size-5 animate-spin text-slate-400" />
          )}
        </div>

        <div className="flex flex-col items-center gap-0.5 text-center">
          <p className="text-sm font-semibold fullscreen:text-2xl">{title}</p>
          <p className="font-mono text-[11px] break-all text-slate-500 fullscreen:text-base">
            {share ? share.url : "Menyiapkan tautan…"}
          </p>
        </div>
      </div>

      {share && (
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          Tautannya aktif sampai {shareExpiry(share)}. Setelah itu QR ini tidak
          bisa dipakai lagi.
        </p>
      )}

      {(error || link.state === "failed") && (
        <p className="text-destructive flex items-start gap-1.5 text-[11px] leading-relaxed">
          <TriangleAlert className="mt-0.5 size-3 shrink-0" />
          {error ?? (link.state === "failed" ? link.message : null)}
        </p>
      )}

      <DialogFooter className="sm:justify-between">
        <div className="flex gap-1.5">
          {link.state === "failed" ? (
            <Button variant="outline" size="sm" onClick={create}>
              <RotateCcw />
              Coba lagi
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={copyLink}
                disabled={!share}
              >
                {copied ? <Check /> : <Copy />}
                {copied ? "Tersalin" : "Salin tautan"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!share) return;
                  const filename = exportFilename(`${title} qr`, "png");
                  downloadDataUrl(share.qr.dataUrl, filename);
                  toast({
                    variant: "success",
                    title: "QR tersimpan",
                    description: `${filename} · ${share.qr.pixels}×${share.qr.pixels} px`,
                  });
                }}
                disabled={!share}
              >
                <Download />
                Unduh QR
              </Button>
              <Button variant="outline" size="sm" onClick={goFullscreen}>
                <Maximize2 />
                Layar penuh
              </Button>
            </>
          )}
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
