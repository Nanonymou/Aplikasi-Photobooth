"use client";

import { useEffect, useMemo, useRef } from "react";
import { Rect } from "react-konva";
import type Konva from "konva";
import { useReducedMotion } from "motion/react";

import { getEffect } from "@/lib/editor/filters";
import { particleOffset, particleTile } from "@/lib/editor/particles";
import type { CanvasPage } from "@/types/editor";

/**
 * One weather effect, drawn across the page and falling.
 *
 * The field is a tiled pattern rather than a few hundred individual nodes: Konva
 * repeats one seamless tile over the page, and sliding the pattern's offset each
 * frame *is* the fall — cheap enough to stay smooth at any page size, and it
 * cannot drift out of the frame the way real sprites would.
 *
 * The offset is animated imperatively — the frame loop writes straight to the
 * node — instead of through React state: sixty state updates a second would
 * re-render the whole stage for a number only this rect cares about.
 */
function ParticleField({
  effectId,
  page,
}: {
  effectId: string;
  page: CanvasPage;
}) {
  const rectRef = useRef<Konva.Rect>(null);
  const reduceMotion = useReducedMotion();
  const effect = getEffect(effectId);
  const spec = effect?.particle;

  // Tiles are pure functions of the spec, so one is built per effect and reused
  // across frames and pages.
  const tile = useMemo(() => (spec ? particleTile(spec) : null), [spec]);

  useEffect(() => {
    const node = rectRef.current;
    if (!node || !spec || reduceMotion) return;

    const started = performance.now();
    let raf = 0;

    const step = (now: number) => {
      // Negative elapsed slides the pattern the way the specks fall: the field
      // moves down, so the sampling origin moves up.
      node.fillPatternOffset(particleOffset(spec, -(now - started)));
      node.getLayer()?.batchDraw();
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [spec, reduceMotion]);

  if (!effect || !spec || !tile) return null;

  return (
    <Rect
      ref={rectRef}
      x={0}
      y={0}
      width={page.width}
      height={page.height}
      // Konva types this as an HTMLImageElement, but it hands the value to
      // `createPattern`, which takes any CanvasImageSource — a canvas included.
      fillPatternImage={tile as unknown as HTMLImageElement}
      fillPatternRepeat="repeat"
      opacity={effect.opacity}
      // Weather sits above the artwork and must never swallow a click meant for
      // an object underneath it.
      listening={false}
      globalCompositeOperation={
        effect.blend as GlobalCompositeOperation | undefined
      }
    />
  );
}

/**
 * The page's weather, above everything else on the stage.
 *
 * Only particle effects render here; the light and texture washes are a
 * different shape of problem and land in their own task. Unknown ids are simply
 * skipped, so a project saved by a newer build still opens.
 */
export function WeatherLayer({ page }: { page: CanvasPage }) {
  const effects = page.effects ?? [];
  if (effects.length === 0) return null;

  return (
    <>
      {effects
        .filter((id) => getEffect(id)?.particle)
        .map((id) => (
          <ParticleField key={id} effectId={id} page={page} />
        ))}
    </>
  );
}
