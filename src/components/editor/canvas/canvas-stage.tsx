"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type Konva from "konva";
import { Group, Layer, Line, Rect, Stage } from "react-konva";

import { useImage } from "@/hooks/use-image";
import { useObjectDrag } from "@/hooks/use-object-drag";
import { STICKERS } from "@/lib/editor/decorations";
import { STICKER_DRAG_TYPE } from "@/lib/editor/drag-payload";
import { createId } from "@/lib/editor/id";
import { EXPORT_CHROME, registerStage } from "@/lib/editor/stage-registry";
import {
  patternDataUri,
  transparencyCheckerDataUri,
  type PatternId,
} from "@/lib/editor/patterns";
import {
  useEditorStore,
  useActivePage,
  ZOOM_MAX,
  ZOOM_MIN,
  type ObjectUpdate,
} from "@/store/editor-store";
import type {
  CanvasObject,
  CanvasPage,
  PageBackground,
  TextObject,
} from "@/types/editor";

import { CanvasObjectNode } from "./canvas-object";
import { TextEditorOverlay } from "./text-editor-overlay";
import { MIN_OBJECT_SIZE, SelectionTransformer } from "./selection-transformer";
import { WeatherLayer } from "./weather-layer";

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

/** Checkerboard standing in for "no background", the usual transparency cue. */
function TransparentBackground({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const image = useImage(transparencyCheckerDataUri());

  return (
    <>
      <Rect
        width={width}
        height={height}
        fill="#ffffff"
        name={EXPORT_CHROME}
        listening={false}
      />
      {image && (
        <Rect
          width={width}
          height={height}
          fillPatternImage={image}
          fillPatternRepeat="repeat"
          name={EXPORT_CHROME}
          listening={false}
        />
      )}
    </>
  );
}

/** Tiled SVG pattern background. Split out so it can use the image-loading hook. */
function PatternBackground({
  background,
  width,
  height,
}: {
  background: Extract<PageBackground, { type: "pattern" }>;
  width: number;
  height: number;
}) {
  const image = useImage(
    patternDataUri(
      background.pattern as PatternId,
      background.foreground,
      background.background,
    ),
  );

  return (
    <>
      {/* The base colour is painted separately so the page is never transparent
          while the pattern tile is still decoding. */}
      <Rect
        width={width}
        height={height}
        fill={background.background}
        listening={false}
      />
      {image && (
        <Rect
          width={width}
          height={height}
          fillPatternImage={image}
          fillPatternRepeat="repeat"
          fillPatternScale={{ x: background.scale, y: background.scale }}
          listening={false}
        />
      )}
    </>
  );
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
  if (background.type === "transparent") {
    return <TransparentBackground width={width} height={height} />;
  }

  if (background.type === "pattern") {
    return (
      <PatternBackground
        background={background}
        width={width}
        height={height}
      />
    );
  }

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
  const stageRef = useRef<Konva.Stage>(null);
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
  const updateObjects = useEditorStore((state) => state.updateObjects);
  const beginInteraction = useEditorStore((state) => state.beginInteraction);
  const endInteraction = useEditorStore((state) => state.endInteraction);

  // Konva paints text to a canvas, so a late-loading webfont needs an explicit
  // repaint once it is ready — React has no reason to re-render on its own.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);

  const [, setFontsReady] = useState(false);
  useEffect(() => {
    document.fonts?.ready.then(() => setFontsReady(true));
  }, []);

  const fitted = fitZoom(page, viewport.width, viewport.height);
  const effectiveZoom = zoomMode === "fit" ? fitted : zoom;

  const drag = useObjectDrag(page, effectiveZoom);

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

  // Export runs from the top bar, so it needs the stage plus the transform that
  // locates the page inside it.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    registerStage({
      stage,
      origin: { x: offsetX, y: offsetY },
      zoom: effectiveZoom,
    });
    return () => registerStage(null);
  }, [offsetX, offsetY, effectiveZoom]);

  const handleWheel = useCallback(
    (event: Konva.KonvaEventObject<WheelEvent>) => {
      if (!event.evt.ctrlKey && !event.evt.metaKey) return;

      event.evt.preventDefault();
      const next = effectiveZoom * (event.evt.deltaY > 0 ? 0.92 : 1.08);
      setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next)));
    },
    [effectiveZoom, setZoom],
  );

  /**
   * Folds the transformer's scale back into the model.
   *
   * Konva resizes by scaling the node, but objects store real `width`/`height`,
   * so the scale is baked into the size here and reset to 1. The node's
   * `x`/`y` is the box centre (its offset is half its size), which is what makes
   * the top-left recomputation below correct even after a rotation.
   */
  const handleTransformEnd = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const updates: ObjectUpdate[] = [];

    for (const id of selectedIds) {
      const node = stage.findOne(`#${id}`);
      const object = page.objects.find((candidate) => candidate.id === id);
      if (!node || !object) continue;

      const width = Math.max(MIN_OBJECT_SIZE, object.width * node.scaleX());
      const height = Math.max(MIN_OBJECT_SIZE, object.height * node.scaleY());

      const patch: Partial<CanvasObject> = {
        x: node.x() - width / 2,
        y: node.y() - height / 2,
        width,
        height,
        rotation: node.rotation(),
      };

      // Text keeps its own font size, so scale it with the vertical handle:
      // corner handles then scale the type, while side handles only re-wrap it.
      if (object.kind === "text") {
        (patch as Partial<TextObject>).fontSize = Math.max(
          4,
          object.fontSize * node.scaleY(),
        );
      }

      updates.push({ id, patch });
      node.scaleX(1);
      node.scaleY(1);
    }

    if (updates.length === 0) return;

    beginInteraction();
    updateObjects(updates);
    endInteraction();
  }, [selectedIds, page.objects, updateObjects, beginInteraction, endInteraction]);

  /**
   * Places a sticker dragged in from the library at the cursor, converting the
   * drop point from screen space back into page coordinates.
   */
  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDropActive(false);

      const stickerId = event.dataTransfer.getData(STICKER_DRAG_TYPE);
      const sticker = STICKERS.find((item) => item.id === stickerId);
      const container = containerRef.current;
      if (!sticker || !container) return;

      const rect = container.getBoundingClientRect();
      const size = Math.round(Math.min(page.width, page.height) * 0.16);
      const pageX = (event.clientX - rect.left - offsetX) / effectiveZoom;
      const pageY = (event.clientY - rect.top - offsetY) / effectiveZoom;

      useEditorStore.getState().addObject({
        id: createId("sticker"),
        kind: "sticker",
        name: sticker.label,
        // Centre the sticker on the cursor, which is where it looked like it
        // was while being dragged.
        x: pageX - size / 2,
        y: pageY - size / 2,
        width: size,
        height: size,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        content: sticker.glyph,
      });
    },
    [page.width, page.height, offsetX, offsetY, effectiveZoom],
  );

  const handleDoubleClick = useCallback(
    (id: string) => {
      const object = page.objects.find((candidate) => candidate.id === id);
      if (object?.kind === "text" && !object.locked) setEditingId(id);
    },
    [page.objects],
  );

  const handleStageMouseDown = useCallback(
    (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      // Objects stop propagation themselves, so reaching here means empty stage.
      if (event.target === event.target.getStage()) clearSelection();
    },
    [clearSelection],
  );

  const handlePointerDown = useCallback(
    (id: string, additive: boolean) => {
      if (additive) {
        toggleSelect(id);
        return;
      }
      // Pressing on an object that is already part of a multi-selection must
      // keep that selection, otherwise the group could never be dragged.
      if (useEditorStore.getState().selectedIds.includes(id)) return;
      select([id]);
    },
    [select, toggleSelect],
  );

  const handleClick = useCallback(
    (id: string, additive: boolean) => {
      if (additive) return; // Already handled on pointer down.

      // Clicking (without dragging) a member of a multi-selection isolates it.
      const { selectedIds: current } = useEditorStore.getState();
      if (current.length > 1 && current.includes(id)) select([id]);
    },
    [select],
  );

  const editingObject = page.objects.find(
    (object): object is TextObject =>
      object.id === editingId && object.kind === "text",
  );

  const panning = activeTool === "hand";

  return (
    <div
      ref={containerRef}
      className="stage-checkerboard relative h-full w-full overflow-hidden"
      data-panning={panning || undefined}
      style={{ cursor: panning ? "grab" : "default" }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(STICKER_DRAG_TYPE)) return;
        // Preventing default is what marks this as a valid drop target.
        event.preventDefault();
        setDropActive(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        setDropActive(false);
      }}
      onDrop={handleDrop}
    >
      {dropActive && (
        <div className="border-primary pointer-events-none absolute inset-2 z-10 rounded-lg border-2 border-dashed" />
      )}
      {viewport.width > 0 && viewport.height > 0 && (
        <Stage
          ref={stageRef}
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
                name={EXPORT_CHROME}
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
                  // The transformer already frames a single selection; the dashed
                  // outline is only needed to show group membership.
                  outlined={
                    selectedIds.length > 1 && selectedIds.includes(object.id)
                  }
                  draggable={!panning && !object.locked}
                  editing={object.id === editingId}
                  onPointerDown={handlePointerDown}
                  onClick={handleClick}
                  onDoubleClick={handleDoubleClick}
                  onDragStart={drag.onDragStart}
                  onDragMove={drag.onDragMove}
                  onDragEnd={drag.onDragEnd}
                />
              ))}

              {/* Weather falls over the finished artwork, so it is drawn after
                  every object but before the editing chrome. */}
              <WeatherLayer page={page} />

              {drag.guides.map((guide) => (
                <Line
                  key={`${guide.axis}-${guide.position}`}
                  points={
                    guide.axis === "x"
                      ? [guide.position, 0, guide.position, page.height]
                      : [0, guide.position, page.width, guide.position]
                  }
                  stroke="#f472b6"
                  strokeWidth={1}
                  dash={[6, 4]}
                  strokeScaleEnabled={false}
                  name={EXPORT_CHROME}
                  listening={false}
                />
              ))}
            </Group>

            <SelectionTransformer
              stageRef={stageRef}
              selectedIds={selectedIds}
              objects={page.objects}
              enabled={!panning}
              onTransformEnd={handleTransformEnd}
            />
          </Layer>
        </Stage>
      )}

      {editingObject && (
        <TextEditorOverlay
          object={editingObject}
          zoom={effectiveZoom}
          offsetX={offsetX}
          offsetY={offsetY}
          onCommit={(text) => {
            if (text !== editingObject.text) {
              useEditorStore.getState().updateObject(editingObject.id, { text });
            }
            setEditingId(null);
          }}
          onCancel={() => setEditingId(null)}
        />
      )}
    </div>
  );
}
