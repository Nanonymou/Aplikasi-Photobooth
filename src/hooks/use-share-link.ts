"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  createShare,
  renderSharePng,
  type CreatedShare,
} from "@/lib/editor/share";
import { useActivePage, useEditorStore } from "@/store/editor-store";

export type ShareLink =
  | { state: "idle" }
  | { state: "working" }
  | { state: "ready"; share: CreatedShare }
  | { state: "failed"; message: string };

const IDLE: ShareLink = { state: "idle" };

/**
 * Links already minted, at module scope and keyed by the picture behind them.
 *
 * Two dialogs publish the same canvas — the share sheet and the QR card — and
 * either can be opened first. Keeping the result here means the second one
 * shows the link the first one made instead of uploading the same picture
 * again under a second code.
 *
 * The key carries `updatedAt` because that is what the store moves on an edit:
 * re-opening a dialog reuses the link, but editing the canvas and opening it
 * again publishes what is now on screen. A QR that still pointed at the
 * previous rendering would send a guest home with the wrong photo.
 */
const links = new Map<string, ShareLink>();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export interface ShareLinkHandle {
  link: ShareLink;
  /**
   * Publishes the canvas, unless this exact picture already has a link or is
   * being uploaded right now. Safe to call on every render pass of an effect.
   */
  create: () => void;
}

/**
 * The share link for what is currently on the canvas.
 *
 * Publishing is an upload of the user's picture, so it happens when a dialog
 * that exists to hand out a link is opened — not on a whim of the editor.
 */
export function useShareLink(): ShareLinkHandle {
  const page = useActivePage();
  const projectId = useEditorStore((state) => state.project.id);
  const title = useEditorStore((state) => state.project.title);
  const updatedAt = useEditorStore((state) => state.project.updatedAt);
  const designId = useEditorStore((state) => state.remoteId);

  const key = `${projectId}:${updatedAt}`;
  const link = useSyncExternalStore(
    subscribe,
    () => links.get(key) ?? IDLE,
    () => IDLE,
  );

  const create = useCallback(() => {
    const current = links.get(key);
    // A failed attempt is worth repeating — the network may have come back.
    if (current && current.state !== "failed") return;

    links.set(key, { state: "working" });
    emit();

    void (async () => {
      try {
        const rendered = await renderSharePng(page, title);
        const share = await createShare(
          rendered.blob,
          rendered.filename,
          designId ?? undefined,
        );
        links.set(key, { state: "ready", share });
      } catch (cause) {
        links.set(key, {
          state: "failed",
          message:
            cause instanceof Error ? cause.message : "Tautan gagal dibuat.",
        });
      }
      emit();
    })();
  }, [key, page, title, designId]);

  return { link, create };
}

/** How long the link stays alive, phrased for a person reading a dialog. */
export function shareExpiry(share: CreatedShare): string {
  return new Date(share.expiresAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
