"use client";

import { useEffect } from "react";
import { CameraOff, LoaderCircle, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CameraStatus } from "@/hooks/use-camera";

/**
 * Simulated preview for demo mode: a slow gradient behind a silhouette, so the
 * page reads as a live camera even with no device attached.
 */
function DemoPreview() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-fuchsia-500/70 via-violet-500/60 to-sky-500/70" />
      <svg
        viewBox="0 0 160 90"
        className="absolute inset-0 size-full"
        aria-hidden="true"
      >
        <circle cx="80" cy="38" r="16" fill="#ffffff" opacity="0.85" />
        <path
          d="M50 90c0-16.6 13.4-30 30-30s30 13.4 30 30z"
          fill="#ffffff"
          opacity="0.85"
        />
      </svg>
    </div>
  );
}

function StatusOverlay({
  status,
  error,
  onRetry,
  onUseDemo,
}: {
  status: CameraStatus;
  error: string | null;
  onRetry: () => void;
  onUseDemo: () => void;
}) {
  if (status === "requesting") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-center">
        <LoaderCircle className="size-6 animate-spin text-white" />
        <p className="text-sm text-white">Meminta izin kamera…</p>
      </div>
    );
  }

  if (status === "denied" || status === "unavailable") {
    const Icon = status === "denied" ? ShieldAlert : CameraOff;

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 px-6 text-center">
        <Icon className="size-7 text-white" />
        <p className="max-w-sm text-sm text-white/90">{error}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button size="sm" onClick={onRetry}>
            Coba lagi
          </Button>
          <Button size="sm" variant="secondary" onClick={onUseDemo}>
            Pakai mode demo
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

/** The viewfinder: live webcam video, or the demo stand-in. */
export function CameraPreview({
  videoRef,
  stream,
  status,
  error,
  demoMode,
  reviewSrc,
  onRetry,
  onUseDemo,
}: {
  /** Owned by the studio, which needs the element to grab frames. */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  status: CameraStatus;
  error: string | null;
  demoMode: boolean;
  /** When set, the just-taken frame is frozen here for review. */
  reviewSrc?: string | null;
  onRetry: () => void;
  onUseDemo: () => void;
}) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.srcObject = stream;
    return () => {
      video.srcObject = null;
    };
  }, [stream, videoRef]);

  return (
    <div className="bg-editor-stage relative aspect-video w-full overflow-hidden rounded-xl border">
      {demoMode ? (
        <DemoPreview />
      ) : (
        // Kept mounted during review: unmounting the element would drop the
        // stream, and remounting would not re-attach it (the stream is unchanged,
        // so the effect that assigns `srcObject` would not re-run).
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="size-full object-cover"
        />
      )}

      {reviewSrc && (
        <div className="absolute inset-0">
          {/* A data URL or local sample; next/image would only add a round-trip. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={reviewSrc}
            alt="Pratinjau jepretan terakhir"
            className="size-full object-cover"
          />
        </div>
      )}

      {reviewSrc ? (
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white">
          Tinjau jepretan
        </span>
      ) : demoMode ? (
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white">
          Mode demo — data tiruan
        </span>
      ) : (
        <StatusOverlay
          status={status}
          error={error}
          onRetry={onRetry}
          onUseDemo={onUseDemo}
        />
      )}
    </div>
  );
}
