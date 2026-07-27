"use client";

import type Konva from "konva";
import {
  Ellipse,
  Group,
  Image as KonvaImage,
  Rect,
  Shape,
  Text,
} from "react-konva";

import { useImage } from "@/hooks/use-image";
import { resolveFontFamily } from "@/lib/editor/fonts";
import { coverScale, traceSlotPath } from "@/lib/editor/slot-shape";
import type {
  CanvasObject,
  ImageObject,
  PhotoSlotObject,
  ShapeObject,
  StickerObject,
  TextObject,
} from "@/types/editor";

interface ObjectProps<T extends CanvasObject> {
  object: T;
}

/**
 * An emoji's advance width is roughly 1.25em, so a glyph set to the full box size
 * is wider than the box. Konva's word wrap cannot break a single glyph, and drops
 * the line outright — the sticker silently disappears. Keep glyphs comfortably
 * inside their box instead.
 */
const EMOJI_BOX_RATIO = 0.72;

function SlotContents({ object }: ObjectProps<PhotoSlotObject>) {
  const image = useImage(object.photo?.src);

  if (!object.photo || !image) {
    return (
      <>
        <Rect width={object.width} height={object.height} fill={object.fill} />
        <Text
          text="📷"
          fontSize={Math.min(object.width, object.height) * 0.28}
          width={object.width}
          height={object.height}
          align="center"
          verticalAlign="middle"
          opacity={0.35}
          listening={false}
        />
      </>
    );
  }

  const scale =
    coverScale(object.width, object.height, image.width, image.height) *
    object.photo.scale;
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;

  return (
    <>
      <Rect width={object.width} height={object.height} fill={object.fill} />
      <KonvaImage
        image={image}
        x={(object.width - drawWidth) / 2 + object.photo.offsetX}
        y={(object.height - drawHeight) / 2 + object.photo.offsetY}
        width={drawWidth}
        height={drawHeight}
        listening={false}
      />
    </>
  );
}

function PhotoSlot({ object }: ObjectProps<PhotoSlotObject>) {
  return (
    <>
      {/* A polaroid's photo window is inset, so the surrounding paper is drawn
          as its own full-box rect behind the clipped photo. */}
      {object.shape === "polaroid" && (
        <Rect
          width={object.width}
          height={object.height}
          cornerRadius={object.width * 0.03}
          fill={object.borderColor}
          listening={false}
        />
      )}

      <Group
        clipFunc={(ctx) =>
          traceSlotPath(
            ctx,
            object.shape,
            object.width,
            object.height,
            object.cornerRadius,
          )
        }
      >
        <SlotContents object={object} />
      </Group>

      {object.borderWidth > 0 && object.shape !== "polaroid" && (
        <Shape
          sceneFunc={(ctx, shape) => {
            traceSlotPath(
              ctx,
              object.shape,
              object.width,
              object.height,
              object.cornerRadius,
            );
            ctx.strokeShape(shape);
          }}
          stroke={object.borderColor}
          strokeWidth={object.borderWidth}
          listening={false}
        />
      )}
    </>
  );
}

function FreeImage({ object }: ObjectProps<ImageObject>) {
  const image = useImage(object.src);

  if (!image) {
    return (
      <Rect
        width={object.width}
        height={object.height}
        cornerRadius={object.cornerRadius}
        fill="#e2e8f0"
      />
    );
  }

  return (
    <Group
      clipFunc={(ctx) =>
        traceSlotPath(
          ctx,
          "rect",
          object.width,
          object.height,
          object.cornerRadius,
        )
      }
    >
      <KonvaImage
        image={image}
        width={object.width}
        height={object.height}
        listening={false}
      />
    </Group>
  );
}

function TextLayer({ object }: ObjectProps<TextObject>) {
  return (
    <Text
      text={object.text}
      width={object.width}
      fontSize={object.fontSize}
      fontFamily={resolveFontFamily(object.fontFamily)}
      fontStyle={object.fontWeight >= 600 ? "bold" : "normal"}
      letterSpacing={object.letterSpacing}
      lineHeight={object.lineHeight}
      align={object.align}
      fill={object.fill}
      listening={false}
    />
  );
}

function Sticker({ object }: ObjectProps<StickerObject>) {
  return (
    <Text
      text={object.content}
      width={object.width}
      height={object.height}
      fontSize={Math.min(object.width, object.height) * EMOJI_BOX_RATIO}
      align="center"
      verticalAlign="middle"
      listening={false}
    />
  );
}

function BasicShape({ object }: ObjectProps<ShapeObject>) {
  if (object.shape === "ellipse") {
    return (
      <Ellipse
        x={object.width / 2}
        y={object.height / 2}
        radiusX={object.width / 2}
        radiusY={object.height / 2}
        fill={object.fill}
        stroke={object.stroke}
        strokeWidth={object.strokeWidth}
        listening={false}
      />
    );
  }

  return (
    <Rect
      width={object.width}
      height={object.height}
      cornerRadius={object.cornerRadius}
      fill={object.fill}
      stroke={object.stroke}
      strokeWidth={object.strokeWidth}
      listening={false}
    />
  );
}

/**
 * Renders one object at its page position.
 *
 * The group is placed at the object's centre with a matching offset, so children
 * can draw from local (0,0) while `rotation` still pivots around the centre and
 * `object.x`/`object.y` keep meaning "top-left" everywhere else in the app.
 */
export function CanvasObjectNode({
  object,
  selected,
  draggable,
  onPointerDown,
  onClick,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  object: CanvasObject;
  selected: boolean;
  draggable: boolean;
  onPointerDown: (id: string, additive: boolean) => void;
  onClick: (id: string, additive: boolean) => void;
  onDragStart: (id: string, node: Konva.Node) => void;
  onDragMove: (id: string, node: Konva.Node) => void;
  onDragEnd: (id: string, node: Konva.Node) => void;
}) {
  if (!object.visible) return null;

  return (
    <Group
      id={object.id}
      name="canvas-object"
      x={object.x + object.width / 2}
      y={object.y + object.height / 2}
      offsetX={object.width / 2}
      offsetY={object.height / 2}
      width={object.width}
      height={object.height}
      rotation={object.rotation}
      opacity={object.opacity}
      listening={!object.locked}
      draggable={draggable}
      onMouseDown={(event) => {
        event.cancelBubble = true;
        onPointerDown(object.id, event.evt.shiftKey);
      }}
      onTouchStart={(event) => {
        event.cancelBubble = true;
        onPointerDown(object.id, false);
      }}
      // Konva suppresses `click` after a drag, so this only fires on a real
      // click — which is where collapsing a multi-selection belongs.
      onClick={(event) => {
        event.cancelBubble = true;
        onClick(object.id, event.evt.shiftKey);
      }}
      onTap={(event) => {
        event.cancelBubble = true;
        onClick(object.id, false);
      }}
      onDragStart={(event) => onDragStart(object.id, event.target)}
      onDragMove={(event) => onDragMove(object.id, event.target)}
      onDragEnd={(event) => onDragEnd(object.id, event.target)}
      onMouseEnter={(event) => {
        if (!draggable) return;
        const container = event.target.getStage()?.container();
        if (container) container.style.cursor = "move";
      }}
      onMouseLeave={(event) => {
        const container = event.target.getStage()?.container();
        if (container) container.style.cursor = "";
      }}
    >
      {object.kind === "slot" && <PhotoSlot object={object} />}
      {object.kind === "image" && <FreeImage object={object} />}
      {object.kind === "text" && <TextLayer object={object} />}
      {object.kind === "sticker" && <Sticker object={object} />}
      {object.kind === "shape" && <BasicShape object={object} />}

      {/*
        The artwork itself is not hit-testable: text glyphs and emoji cover only
        a fraction of their box, which would make objects fiddly to grab. This
        transparent rect gives every object the same full-bounds grab target.
      */}
      <Rect width={object.width} height={object.height} fill="transparent" />

      {selected && (
        <Rect
          width={object.width}
          height={object.height}
          stroke="#a855f7"
          strokeWidth={2}
          dash={[8, 5]}
          strokeScaleEnabled={false}
          listening={false}
        />
      )}
    </Group>
  );
}
