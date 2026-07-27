"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A one-shot countdown in whole seconds.
 *
 * The remaining count is tracked in a closure variable rather than derived from
 * state inside the tick, so `onComplete` fires from the interval callback and
 * never from inside a state updater (which React may run more than once).
 */
export function useCountdown(onComplete: () => void) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep the latest callback without restarting a running countdown.
  const completeRef = useRef(onComplete);
  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  const cancel = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRemaining(null);
  }, []);

  const start = useCallback(
    (seconds: number) => {
      if (intervalRef.current) clearInterval(intervalRef.current);

      if (seconds <= 0) {
        completeRef.current();
        return;
      }

      let left = seconds;
      setRemaining(left);

      intervalRef.current = setInterval(() => {
        left -= 1;

        if (left <= 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          setRemaining(null);
          completeRef.current();
          return;
        }

        setRemaining(left);
      }, 1000);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { remaining, running: remaining !== null, start, cancel };
}
