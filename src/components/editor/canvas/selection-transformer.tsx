"use client";

import { useEffect, useRef } from "react";
import type Konva from "konva";
import { Transformer } from "react-konva";

import { EXPORT_CHROME } from "@/lib/editor/stage-registry";
import type { CanvasObject } from "@/types/editor";

/** Smallest edge an object can be resized to, in page px. */
export const MIN_OBJECT_SIZE = 16;

/** Rotation stops, every 15°, with a gentle pull. */
const ROTATION_SNAPS = Array.from({ length: 24 }, (_, index) => index * 15);

/**
 * Resize and rotate handles for the current selection.
 *
 * Rendered as a sibling of the (zoomed) page group rather than inside it, so the
 * handles stay a constant size on screen at any zoom level — Konva positions the
 * transformer from each node's absolute transform.
 */
export function SelectionTransformer({
  stageRef,
  selectedIds,
  objects,
  enabled,
  onTransformEnd,
}: {
  stageRef: React.RefObject<Konva.Stage | null>;
  selectedIds: string[];
  objects: CanvasObject[];
  enabled: boolean;
  onTransformEnd: () => void;
}) {
  const transformerRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage) return;

    const nodes = enabled
      ? selectedIds
          .map((id) => stage.findOne(`#${id}`))
          .filter((node): node is Konva.Node => {
            if (!node) return false;
            const object = objects.find((candidate) => candidate.id === node.id());
            return !!object && !object.locked && object.visible;
          })
      : [];

    transformer.nodes(nodes);
    // `objects` is a dependency because replacing the page's objects creates new
    // Konva nodes, and the transformer would otherwise hold stale ones.
  }, [selectedIds, objects, enabled, stageRef]);

  return (
    <Transformer
      ref={transformerRef}
      name={EXPORT_CHROME}
      rotateEnabled
      rotationSnaps={ROTATION_SNAPS}
      rotationSnapTolerance={4}
      keepRatio={false}
      flipEnabled={false}
      ignoreStroke
      anchorSize={9}
      anchorCornerRadius={2}
      anchorStroke="#a855f7"
      anchorFill="#ffffff"
      borderStroke="#a855f7"
      borderStrokeWidth={1.5}
      borderDash={[4, 3]}
      onTransformEnd={onTransformEnd}
      boundBoxFunc={(oldBox, newBox) =>
        Math.abs(newBox.width) < MIN_OBJECT_SIZE ||
        Math.abs(newBox.height) < MIN_OBJECT_SIZE
          ? oldBox
          : newBox
      }
    />
  );
}
