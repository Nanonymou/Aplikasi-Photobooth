"use client";

import { useEffect, useState } from "react";

import {
  ConflictError,
  createDesign,
  fetchDesign,
  saveDesign,
} from "@/lib/editor/sync";
import { useEditorStore } from "@/store/editor-store";
import { toast } from "@/store/toast-store";

/** How long the project must sit unchanged before it is written. */
const DEBOUNCE_MS = 1200;

/**
 * Write state, at module scope rather than per mount.
 *
 * There is one editor store, so there is one design being saved — but a client
 * navigation (gallery → editor) mounts the next shell before unmounting the
 * last, and two mounts each holding their own "am I writing?" flag both saw a
 * design with no id yet and both created one. Measured: opening the editor and
 * typing a title produced two rows, the second under the default title nobody
 * asked to keep.
 *
 * Hoisting the flags out makes "one write at a time" true across mounts, which
 * is the scope the statement was always about.
 */
let writing = false;
let again = false;
let timer: ReturnType<typeof setTimeout> | undefined;

/**
 * The project's `updatedAt` as it stood when the canvas settled.
 *
 * The save fires on the project object changing, and on mount the editor
 * replaces that object without anybody having edited anything — which was
 * enough to write the untouched starter canvas to the server, so every account
 * that so much as opened the editor collected a design called
 * "Wisuda 2026 — Photostrip" it never made.
 *
 * `updatedAt` moves only through `commit`, which is the store's own definition
 * of an edit. Comparing against the value at rest is therefore the same question
 * the user would ask: has anything actually changed since I got here?
 */
let baseline: string | null = null;

/**
 * Keeps the editor's design in step with the server.
 *
 * The counterpart to `useAutosave`, and they are mutually exclusive by design:
 * a guest's only copy is in this browser, so autosave writes `localStorage`; an
 * account's copy belongs to the server, so this writes there. Running both would
 * mean two sources of truth for one canvas and a stale local copy overwriting a
 * newer remote one on the next visit.
 *
 * Given a design id it loads that design first. Given none, the first edit
 * creates one — the editor is where a design comes into being, and asking
 * somebody to name and create a file before they can draw is a step from an era
 * of applications this one is not from.
 *
 * The write is version-checked. Two tabs on one design otherwise overwrite each
 * other silently; a 409 stops the loop and says so, because only the person with
 * both windows open knows which version they meant.
 */
export function useRemoteDesign(designId: string | null, enabled: boolean) {
  const [loading, setLoading] = useState(enabled && designId !== null);

  // Load: the design named in the URL becomes what is on the canvas.
  useEffect(() => {
    if (!enabled) return;

    // Nothing to load, so the restore has already settled. Saying so matters:
    // the save subscription below only writes a *hydrated* store, which is what
    // stops a half-restored canvas from being written over the real one — and
    // without this a signed-in editor with a blank canvas could never save at
    // all, because nothing would ever mark it settled.
    if (!designId) {
      const store = useEditorStore.getState();
      if (!store.hydrated) store.hydrateProject(null);
      baseline ??= store.project.updatedAt;
      return;
    }

    let current = true;
    void (async () => {
      try {
        const remote = await fetchDesign(designId);
        if (!current) return;

        if (!remote) {
          toast({
            variant: "error",
            title: "Desain tidak ditemukan",
            description: "Mungkin sudah dihapus, atau bukan milik akun ini.",
          });
          return;
        }

        const store = useEditorStore.getState();
        store.hydrateProject(remote.project);
        store.setRemote(designId, remote.version);
        // Freshly loaded is unedited: nothing to write until somebody changes it.
        baseline = remote.project.updatedAt;
      } catch (cause) {
        if (!current) return;
        toast({
          variant: "error",
          title: "Desain gagal dimuat",
          description: cause instanceof Error ? cause.message : undefined,
        });
      } finally {
        if (current) setLoading(false);
      }
    })();

    return () => {
      current = false;
    };
  }, [designId, enabled]);

  // Save: every settled edit goes to the server.
  useEffect(() => {
    if (!enabled) return;

    async function flush() {
      // One write at a time, across every mount. An edit that lands mid-write
      // is not dropped — it sets `again`, and the write that is finishing
      // starts another.
      if (writing) {
        again = true;
        return;
      }
      const store = useEditorStore.getState();
      const { project, remoteId, remoteVersion } = store;

      // Asked here rather than only where the write is scheduled, because
      // `pagehide` calls this directly — and that path is exactly how an
      // untouched starter canvas reached the server: navigating away from the
      // editor flushed a project nobody had edited, and every account that
      // passed through collected a design called "Wisuda 2026 — Photostrip".
      if (baseline !== null && project.updatedAt === baseline) return;

      writing = true;

      try {
        if (!remoteId) {
          const created = await createDesign(project);
          useEditorStore.getState().setRemote(created.id, created.version);
        } else {
          const version = await saveDesign(remoteId, remoteVersion, project);
          useEditorStore.getState().setRemote(remoteId, version);
        }
        baseline = useEditorStore.getState().project.updatedAt;
        useEditorStore
          .getState()
          .setSaveStatus("saved", new Date().toISOString());
      } catch (cause) {
        useEditorStore.getState().setSaveStatus("error");
        toast({
          variant: "error",
          title:
            cause instanceof ConflictError
              ? "Desain berubah di tempat lain"
              : "Gagal menyimpan ke akun",
          description: cause instanceof Error ? cause.message : undefined,
        });
        // A conflict will not resolve by retrying with the same version, and a
        // failed write should not spin: the next real edit tries again.
        again = false;
      } finally {
        writing = false;
        if (again) {
          again = false;
          void flush();
        }
      }
    }

    const unsubscribe = useEditorStore.subscribe((state, previous) => {
      if (!state.hydrated || state.project === previous.project) return;

      // Only a moved `updatedAt` is an edit — the store bumps it in `commit`
      // and nowhere else — and only an edit is worth a write. `flush` asks the
      // same question again, because it has callers other than this one.
      if (baseline !== null && state.project.updatedAt === baseline) return;

      if (state.saveStatus !== "saving") state.setSaveStatus("saving");
      clearTimeout(timer);
      timer = setTimeout(() => void flush(), DEBOUNCE_MS);
    });

    // Leaving the page must not drop an edit still inside the debounce.
    const onPageHide = () => void flush();
    window.addEventListener("pagehide", onPageHide);

    return () => {
      unsubscribe();
      window.removeEventListener("pagehide", onPageHide);
      // The timer is shared, so it is not cleared here: a debounced edit made
      // just before a client navigation still has to reach the server, and the
      // next mount's subscription would not know to write it.
    };
  }, [enabled]);

  return { loading };
}
