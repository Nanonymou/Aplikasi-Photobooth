"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AiJobStatus = "idle" | "running" | "done" | "error";

export interface AiJob {
  toolId: string | null;
  status: AiJobStatus;
  /** 0–1. */
  progress: number;
  message: string | null;
}

const IDLE: AiJob = { toolId: null, status: "idle", progress: 0, message: null };

const TICK_MS = 120;

/**
 * Runs one AI tool at a time and reports progress.
 *
 * The progress here is simulated on a timer: the real provider is a backend
 * task, and until it exists the panel still needs a truthful "this takes a
 * while" shape to build against. `apply` is where the actual edit happens, so
 * swapping the timer for a server call later does not touch the panel.
 */
export function useAiJob() {
  const [job, setJob] = useState<AiJob>(IDLE);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const cancel = useCallback(() => {
    clear();
    setJob(IDLE);
  }, [clear]);

  const run = useCallback(
    (
      toolId: string,
      estimatedSeconds: number,
      apply: () => void | Promise<void>,
    ) => {
      clear();
      setJob({ toolId, status: "running", progress: 0, message: null });

      const steps = Math.max(1, Math.round((estimatedSeconds * 1000) / TICK_MS));
      let step = 0;

      timerRef.current = setInterval(() => {
        step += 1;

        if (step >= steps) {
          clear();
          // `apply` may be async (image decoding, and later a network call), so
          // the result is awaited — reporting "done" before the work finished
          // would be a lie, and a rejection would go unhandled.
          void (async () => {
            try {
              await apply();
              setJob({
                toolId,
                status: "done",
                progress: 1,
                message: "Selesai diterapkan.",
              });
            } catch {
              setJob({
                toolId,
                status: "error",
                progress: 1,
                message: "Gagal memproses. Coba lagi.",
              });
            }
          })();
          return;
        }

        setJob((current) => ({ ...current, progress: step / steps }));
      }, TICK_MS);
    },
    [clear],
  );

  useEffect(() => clear, [clear]);

  return { job, run, cancel, reset: cancel };
}
