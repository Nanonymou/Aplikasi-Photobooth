"use client";

import { useEffect, useState } from "react";

interface LoadedImage {
  src: string;
  element: HTMLImageElement;
}

/**
 * Loads an image for Konva, which needs a decoded `HTMLImageElement` rather than
 * a URL. Returns `null` until the image is ready (or if it failed).
 *
 * The loaded src is stored alongside the element so a changed `src` reads as
 * "not ready yet" during render, rather than needing a state reset in an effect.
 */
export function useImage(src: string | undefined | null) {
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);

  useEffect(() => {
    if (!src) return;

    const element = new window.Image();
    element.crossOrigin = "anonymous";
    let cancelled = false;

    element.onload = () => {
      if (!cancelled) setLoaded({ src, element });
    };
    element.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  return loaded && loaded.src === src ? loaded.element : null;
}
