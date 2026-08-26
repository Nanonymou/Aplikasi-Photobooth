"use client";

import { useEffect } from "react";

import { useEditorStore } from "@/store/editor-store";

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

/** Keyboard shortcuts for the toolbar actions. Ignored while typing in a field. */
export function useEditorShortcuts() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;

      const store = useEditorStore.getState();
      const mod = event.ctrlKey || event.metaKey;

      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) store.redo();
        else store.undo();
        return;
      }

      if (mod && event.key === "0") {
        event.preventDefault();
        store.zoomToFit();
        return;
      }

      if (mod && event.key === "1") {
        event.preventDefault();
        store.resetZoom();
        return;
      }

      if (mod && (event.key === "=" || event.key === "+")) {
        event.preventDefault();
        store.zoomIn();
        return;
      }

      if (mod && event.key === "-") {
        event.preventDefault();
        store.zoomOut();
        return;
      }

      // Layer order, following the usual design-tool bindings.
      if (mod && (event.key === "]" || event.key === "}")) {
        event.preventDefault();
        store.reorderSelection(event.shiftKey ? "front" : "forward");
        return;
      }

      if (mod && (event.key === "[" || event.key === "{")) {
        event.preventDefault();
        store.reorderSelection(event.shiftKey ? "back" : "backward");
        return;
      }

      /*
       * Page navigation on Alt+arrow.
       *
       * Alt rather than a bare arrow, which nudges the selected object, and not
       * PageUp/PageDown, which a laptop keyboard reaches through a second
       * modifier anyway. Held here rather than in the strip so it works with the
       * focus anywhere on the canvas.
       */
      if (event.altKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        const pages = store.project.pages;
        const index = pages.findIndex((page) => page.id === store.activePageId);
        const next = pages[index + (event.key === "ArrowRight" ? 1 : -1)];

        if (next) {
          event.preventDefault();
          store.setActivePage(next.id);
        }
        return;
      }

      if (mod) return;

      switch (event.key) {
        case "v":
        case "V":
          store.setActiveTool("select");
          break;
        case "h":
        case "H":
          store.setActiveTool("hand");
          break;
        case "Escape":
          store.clearSelection();
          break;
        case "Delete":
        case "Backspace":
          if (store.selectedIds.length > 0) {
            event.preventDefault();
            store.removeSelected();
          }
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
