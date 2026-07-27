"use client";

import { useCallback, useRef, useState } from "react";
import type Konva from "konva";

import {
  computeSnap,
  objectBox,
  unionBox,
  type SnapGuide,
} from "@/lib/editor/snapping";
import { useEditorStore } from "@/store/editor-store";
import type { CanvasPage } from "@/types/editor";

/** How close (in screen px) an edge must get before it snaps. */
const SNAP_THRESHOLD_PX = 8;

interface DragSession {
  ids: string[];
  /** Top-left of each dragged object when the drag began, in page coordinates. */
  origins: Map<string, { x: number; y: number }>;
  /** The grabbed Konva node's position when the drag began. */
  nodeStart: { x: number; y: number };
}

function sameGuides(a: SnapGuide[], b: SnapGuide[]) {
  return (
    a.length === b.length &&
    a.every(
      (guide, index) =>
        guide.axis === b[index].axis && guide.position === b[index].position,
    )
  );
}

/**
 * Drag-and-drop for canvas objects.
 *
 * Dragging any object in a multi-selection moves the whole selection. Positions
 * are snapped to the page edges/centre and to other objects' edges/centres, and
 * the whole drag collapses into a single undo step.
 */
export function useObjectDrag(page: CanvasPage, zoom: number) {
  const session = useRef<DragSession | null>(null);
  const [guides, setGuides] = useState<SnapGuide[]>([]);

  const onDragStart = useCallback(
    (objectId: string, node: Konva.Node) => {
      const store = useEditorStore.getState();
      // Pointer-down selects before the drag starts, so the selection is current.
      const ids = store.selectedIds.includes(objectId)
        ? store.selectedIds
        : [objectId];

      const origins = new Map<string, { x: number; y: number }>();
      for (const object of page.objects) {
        if (ids.includes(object.id) && !object.locked) {
          origins.set(object.id, { x: object.x, y: object.y });
        }
      }

      session.current = {
        ids: [...origins.keys()],
        origins,
        nodeStart: { x: node.x(), y: node.y() },
      };
      store.beginInteraction();
    },
    [page.objects],
  );

  const onDragMove = useCallback(
    (_objectId: string, node: Konva.Node) => {
      const current = session.current;
      if (!current) return;

      const rawDx = node.x() - current.nodeStart.x;
      const rawDy = node.y() - current.nodeStart.y;

      const dragged = page.objects.filter((object) =>
        current.ids.includes(object.id),
      );
      const movingBoxes = dragged.map((object) => {
        const origin = current.origins.get(object.id)!;
        return {
          x: origin.x + rawDx,
          y: origin.y + rawDy,
          width: object.width,
          height: object.height,
        };
      });

      const targets = page.objects
        .filter((object) => !current.ids.includes(object.id) && object.visible)
        .map(objectBox);

      const snap = computeSnap(
        unionBox(movingBoxes),
        targets,
        page,
        SNAP_THRESHOLD_PX / zoom,
      );

      const dx = rawDx + snap.dx;
      const dy = rawDy + snap.dy;

      useEditorStore.getState().updateObjects(
        current.ids.map((id) => {
          const origin = current.origins.get(id)!;
          return { id, patch: { x: origin.x + dx, y: origin.y + dy } };
        }),
      );

      // Konva recomputes the node position from the pointer on every move, so
      // re-apply the snapped position to keep the node and the store in step.
      node.position({
        x: current.nodeStart.x + dx,
        y: current.nodeStart.y + dy,
      });

      setGuides((previous) =>
        sameGuides(previous, snap.guides) ? previous : snap.guides,
      );
    },
    [page, zoom],
  );

  const onDragEnd = useCallback(() => {
    session.current = null;
    setGuides([]);
    useEditorStore.getState().endInteraction();
  }, []);

  return { guides, onDragStart, onDragMove, onDragEnd };
}
