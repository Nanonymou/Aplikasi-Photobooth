"use client";

import { useEffect } from "react";

import {
  loadStoredProject,
  PROJECT_STORAGE_KEY,
  storeProject,
} from "@/lib/editor/persistence";
import { useEditorStore } from "@/store/editor-store";

/** How long the project must sit unchanged before it is written. */
const DEBOUNCE_MS = 800;

/**
 * Local autosave.
 *
 * Restores the stored project on mount, then writes it back whenever it changes,
 * debounced so a drag or resize produces one write instead of one per frame.
 *
 * For an anonymous guest this local copy is the only copy, and a guest happily
 * keeps two tabs open, so the two must not clobber each other through the one
 * key they share. A `storage` event tells a tab when another one saved; the
 * newer `updatedAt` wins, and the passive tab adopts it without treating the
 * adoption as an edit — otherwise the tabs would write the same project back and
 * forth forever.
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
    // Set just before adopting another tab's project, so the subscription below
    // can tell that change apart from a user edit and not write it straight back.
    let adopting = false;

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

      // A project adopted from another tab is already in storage; writing it
      // again would bounce it back and flicker "Menyimpan…" on both tabs.
      if (adopting) {
        adopting = false;
        return;
      }

      pending = true;
      if (state.saveStatus !== "saving") state.setSaveStatus("saving");

      clearTimeout(timer);
      timer = setTimeout(flush, DEBOUNCE_MS);
    });

    /**
     * Another tab on this device saved. Adopt it only when it is genuinely
     * newer than what this tab holds, so a tab with unsaved edits keeps its own
     * work rather than being overwritten by a stale peer.
     */
    function onStorage(event: StorageEvent) {
      if (event.key !== PROJECT_STORAGE_KEY) return;

      const incoming = loadStoredProject();
      if (!incoming) return;

      const current = useEditorStore.getState().project;
      if (incoming.updatedAt <= current.updatedAt) return;

      adopting = true;
      useEditorStore.getState().hydrateProject(incoming);
      useEditorStore
        .getState()
        .setSaveStatus("saved", new Date().toISOString());
    }

    window.addEventListener("storage", onStorage);

    // Leaving the page must not drop an edit that is still inside the debounce.
    const onPageHide = () => flush();
    window.addEventListener("pagehide", onPageHide);

    return () => {
      unsubscribe();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pagehide", onPageHide);
      // Navigating between editor screens unmounts this hook without a
      // `pagehide`, so an edit still inside the debounce is written here.
      flush();
      clearTimeout(timer);
    };
  }, []);
}
