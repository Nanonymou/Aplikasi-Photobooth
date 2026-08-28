"use client";

import type { EditorProject } from "@/types/editor";

/**
 * The editor's designs, on the server.
 *
 * Autosave has always written to `localStorage`, which is the right home for a
 * guest — it is the only home they have. For an account it is the wrong one: the
 * gallery lists what the *server* holds, so an editor that only ever wrote to
 * this browser produced a gallery that never changed and a design that vanished
 * with the cache.
 *
 * Saving is version-checked. Two tabs on one design would otherwise overwrite
 * each other silently; the server answers 409 and the caller is told, because
 * only the person with both windows open knows which version they meant.
 */

export interface RemoteDesign {
  project: EditorProject;
  version: number;
}

async function refusal(response: Response, fallback: string): Promise<string> {
  const payload: unknown = await response.json().catch(() => null);
  const data =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : {};
  return typeof data.error === "string" ? data.error : fallback;
}

/** Thrown when the design changed underneath this editor. */
export class ConflictError extends Error {
  constructor() {
    super("Desain ini berubah di tempat lain. Muat ulang untuk melihat versi terbaru.");
    this.name = "ConflictError";
  }
}

/** Reads one design, or null when it is not the caller's / not there. */
export async function fetchDesign(id: string): Promise<RemoteDesign | null> {
  const response = await fetch(`/api/designs/${id}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(await refusal(response, "Desain gagal dimuat."));
  }
  const data = (await response.json()) as RemoteDesign;
  return { project: data.project, version: data.version };
}

/** Creates a design from what is on the canvas, returning its new id. */
export async function createDesign(
  project: EditorProject,
): Promise<{ id: string; version: number }> {
  const response = await fetch("/api/designs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: project.title, pages: project.pages }),
  });
  if (!response.ok) {
    throw new Error(await refusal(response, "Desain gagal disimpan."));
  }
  const data = (await response.json()) as { id: string; version: number };
  return { id: data.id, version: data.version };
}

/**
 * Writes the canvas back, refusing to clobber a newer version.
 *
 * Returns the version the server now holds, which is what the next save has to
 * present.
 */
export async function saveDesign(
  id: string,
  version: number,
  project: EditorProject,
): Promise<number> {
  const response = await fetch(`/api/designs/${id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ version, project }),
  });

  if (response.status === 409) throw new ConflictError();
  if (!response.ok) {
    throw new Error(await refusal(response, "Desain gagal disimpan."));
  }

  const data = (await response.json()) as { version: number };
  return data.version;
}
