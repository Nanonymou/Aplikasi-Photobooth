"use client";

import { useMemo } from "react";

import { useActivePage, useEditorStore } from "@/store/editor-store";
import type { CanvasObject } from "@/types/editor";

/**
 * Objects currently selected on the active page.
 *
 * Derived with `useMemo` rather than inside a store selector: a selector that
 * filtered would return a fresh array on every read, which `useSyncExternalStore`
 * treats as a changed snapshot.
 */
export function useSelectedObjects(): CanvasObject[] {
  const page = useActivePage();
  const selectedIds = useEditorStore((state) => state.selectedIds);

  return useMemo(
    () => page.objects.filter((object) => selectedIds.includes(object.id)),
    [page.objects, selectedIds],
  );
}
