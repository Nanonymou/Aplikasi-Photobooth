"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type Konva from "konva";
import { Group, Layer, Rect, Stage } from "react-konva";

import { useEditorStore, useActivePage, ZOOM_MAX, ZOOM_MIN } from "@/store/editor-store";
import type { CanvasPage, PageBackground } from "@/types/editor";

import { CanvasObjectNode } from "./canvas-object";

/** Breathing room between the page edge and the viewport when zoom-to-fit runs. */
const FIT_PADDING = 48;

function gradientPoints(angle: number, width: number, height: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const length = Math.abs(width * dx) + Math.abs(height * dy);

  return {
    start: { x: width / 2 - (dx * length) / 2, y: height / 2 - (dy * length) / 2 },
    end: { x: width / 2 + (dx * length) / 2, y: height / 2 + (dy * length) / 2 },
  };
}

function PageBackgroundRect({
  background,
  width,
  height,
}: {
  background: PageBackground;
  width: number;
  height: number;
}) {
  if (background.type === "gradient") {
    const { start, end } = gradientPoints(background.angle, width, height);

    return (
      <Rect
        width={width}
        height={height}
        fillLinearGradientStartPoint={start}
        fillLinearGradientEndPoint={end}
        fillLinearGradientColorStops={[0, background.from, 1, background.to]}
        listening={false}
      />
    );
  }

  return (
    <Rect
      width={width}
      height={height}
      fill={background.type === "solid" ? background.color : "#ffffff"}
      listening={false}
    />
  );
}

/** Measures the scroll container so the stage can fill it and fit the page. */
function useViewportSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

function fitZoom(page: CanvasPage, width: number, height: number) {
  if (!width || !height) return 1;

  return Math.min(
    (width - FIT_PADDING * 2) / page.width,
    (height - FIT_PADDING * 2) / page.height,
    ZOOM_MAX,
  );
}

export function CanvasStage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewport = useViewportSize(containerRef);
  const page = useActivePage();

  const zoom = useEditorStore((state) => state.zoom);
  const zoomMode = useEditorStore((state) => state.zoomMode);
  const pan = useEditorStore((state) => state.pan);
  const activeTool = useEditorStore((state) => state.activeTool);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const select = useEditorStore((state) => state.select);
  const toggleSelect = useEditorStore((state) => state.toggleSelect);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const setZoom = useEditorStore((state) => state.setZoom);
  const setPan = useEditorStore((state) => state.setPan);

  // Konva paints text to a canvas, so a late-loading webfont needs an explicit
  // repaint once it is ready — React has no reason to re-render on its own.
  const [, setFontsReady] = useState(false);
  useEffect(() => {
    document.fonts?.ready.then(() => setFontsReady(true));
  }, []);

  const fitted = fitZoom(page, viewport.width, viewport.height);
  const effectiveZoom = zoomMode === "fit" ? fitted : zoom;

  // Keep the store's zoom readout in sync while fitting, so the toolbar shows the
  // real percentage instead of a stale manual value.
  const syncedFit = useRef<number>(0);
  useEffect(() => {
    if (zoomMode !== "fit" || !fitted || Math.abs(syncedFit.current - fitted) < 0.001) {
      return;
    }
    syncedFit.current = fitted;
    useEditorStore.setState({ zoom: fitted });
  }, [fitted, zoomMode]);

  const offsetX = (viewport.width - page.width * effectiveZoom) / 2 + pan.x;
  const offsetY = (viewport.height - page.height * effectiveZoom) / 2 + pan.y;

  const handleWheel = useCallback(
    (event: Konva.KonvaEventObject<WheelEvent>) => {
      if (!event.evt.ctrlKey && !event.evt.metaKey) return;

      event.evt.preventDefault();
      const next = effectiveZoom * (event.evt.deltaY > 0 ? 0.92 : 1.08);
      setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next)));
    },
    [effectiveZoom, setZoom],
  );

  const handleStageMouseDown = useCallback(
    (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      // Objects stop propagation themselves, so reaching here means empty stage.
      if (event.target === event.target.getStage()) clearSelection();
    },
    [clearSelection],
  );

  const handleSelect = useCallback(
    (id: string, additive: boolean) => {
      if (additive) toggleSelect(id);
      else select([id]);
    },
    [select, toggleSelect],
  );

  const panning = activeTool === "hand";

  return (
    <div
      ref={containerRef}
      className="stage-checkerboard relative h-full w-full overflow-hidden"
      data-panning={panning || undefined}
      style={{ cursor: panning ? "grab" : "default" }}
    >
      {viewport.width > 0 && viewport.height > 0 && (
        <Stage
          width={viewport.width}
          height={viewport.height}
          draggable={panning}
          onDragEnd={(event) => {
            if (!panning) return;
            setPan({
              x: pan.x + event.target.x(),
              y: pan.y + event.target.y(),
            });
            event.target.position({ x: 0, y: 0 });
          }}
          onWheel={handleWheel}
          onMouseDown={handleStageMouseDown}
          onTouchStart={handleStageMouseDown}
        >
          <Layer>
            <Group
              x={offsetX}
              y={offsetY}
              scaleX={effectiveZoom}
              scaleY={effectiveZoom}
            >
              {/* Paper drop shadow, drawn under the page itself. */}
              <Rect
                width={page.width}
                height={page.height}
                fill="#ffffff"
                shadowColor="#000000"
                shadowBlur={32 / effectiveZoom}
                shadowOpacity={0.35}
                shadowOffsetY={8 / effectiveZoom}
                listening={false}
              />
              <PageBackgroundRect
                background={page.background}
                width={page.width}
                height={page.height}
              />

              {page.objects.map((object) => (
                <CanvasObjectNode
                  key={object.id}
                  object={object}
                  selected={selectedIds.includes(object.id)}
                  onSelect={handleSelect}
                />
              ))}
            </Group>
          </Layer>
        </Stage>
      )}
    </div>
  );
}
