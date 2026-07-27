"use client";

import { useEffect } from "react";

import { loadStoredProject, storeProject } from "@/lib/editor/persistence";
import { useEditorStore } from "@/store/editor-store";

/** How long the project must sit unchanged before it is written. */
const DEBOUNCE_MS = 800;

/**
 * Local autosave.
 *
 * Restores the stored project on mount, then writes it back whenever it changes,
 * debounced so a drag or resize produces one write instead of one per frame.
 *
 * Restoring happens in an effect rather than during render on purpose: the page
 * is prerendered, so reading `localStorage` any earlier would make the server
 * and client markup disagree.
 */
export function useAutosave() {
  useEffect(() => {
    // The store outlives client-side navigation, so a second screen mounting
    // this hook must not re-read storage and clobber in-memory edits.
    if (useEditorStore.getState().hydrated) return;
    useEditorStore.getState().hydrateProject(loadStoredProject());
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending = false;

    function flush() {
      if (!pending) return;
      pending = false;
      clearTimeout(timer);

      const { project, setSaveStatus } = useEditorStore.getState();
      try {
        storeProject(project);
        setSaveStatus("saved", new Date().toISOString());
      } catch {
        // Most likely a full or blocked storage quota.
        setSaveStatus("error");
      }
    }

    const unsubscribe = useEditorStore.subscribe((state, previous) => {
      // Only project edits are persisted — selection, zoom and panel state are
      // per-session. This guard also stops the status write below from looping.
      if (!state.hydrated || state.project === previous.project) return;

      pending = true;
      if (state.saveStatus !== "saving") state.setSaveStatus("saving");

      clearTimeout(timer);
      timer = setTimeout(flush, DEBOUNCE_MS);
    });

    // Leaving the page must not drop an edit that is still inside the debounce.
    const onPageHide = () => flush();
    window.addEventListener("pagehide", onPageHide);

    return () => {
      unsubscribe();
      window.removeEventListener("pagehide", onPageHide);
      // Navigating between editor screens unmounts this hook without a
      // `pagehide`, so an edit still inside the debounce is written here.
      flush();
      clearTimeout(timer);
    };
  }, []);
}
