"use client";

import { useEffect, useState } from "react";
import { CloudAlert, CloudCheck, LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";

/** How often the "x minutes ago" label is refreshed. */
const TICK_MS = 30_000;

function formatRelative(iso: string, now: number): string {
  const minutes = Math.floor(Math.max(0, now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}

/** Autosave state for the top bar. */
export function SaveIndicator({ className }: { className?: string }) {
  const saveStatus = useEditorStore((state) => state.saveStatus);
  const lastSavedAt = useEditorStore((state) => state.lastSavedAt);

  // The label ages on its own, so re-render on a timer rather than on state.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const base = cn("flex items-center gap-1.5 text-xs", className);

  if (saveStatus === "saving") {
    return (
      <span className={cn(base, "text-muted-foreground")} aria-live="polite">
        <LoaderCircle className="size-3.5 animate-spin" />
        Menyimpan…
      </span>
    );
  }

  if (saveStatus === "error") {
    return (
      <span className={cn(base, "text-destructive")} aria-live="polite">
        <CloudAlert className="size-3.5" />
        Gagal menyimpan
      </span>
    );
  }

  if (saveStatus === "saved" && lastSavedAt) {
    return (
      <span className={cn(base, "text-muted-foreground")} aria-live="polite">
        <CloudCheck className="size-3.5" />
        Tersimpan {formatRelative(lastSavedAt, now)}
      </span>
    );
  }

  return (
    <span className={cn(base, "text-muted-foreground")}>
      <CloudCheck className="size-3.5" />
      Tersimpan di perangkat
    </span>
  );
}
