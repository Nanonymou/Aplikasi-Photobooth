"use client";

/**
 * A user's own designs, as the gallery reads and changes them.
 *
 * `GET /api/gallery` already answers exactly what this screen asks — search,
 * scope, sort, the shared count over the whole shelf, and a stable hue per card
 * — so the filtering stays on the server rather than being redone here over
 * whatever page happened to arrive. Client-side filtering of a paged list is
 * how a search box starts missing results that are one page further down.
 *
 * The three actions go to the server first, and the list is refetched from what
 * came back. A gallery that renamed a card locally and let the write fail
 * quietly would show a title that exists nowhere else.
 */

export interface MyDesign {
  id: string;
  title: string;
  /** ISO; the card formats it, so no clock is baked into the data. */
  updatedAt: string;
  pageCount: number;
  shared: boolean;
  width: number | null;
  height: number | null;
  /** Thumbnail tint, derived from the id by the server. */
  hue: number;
}

export interface GalleryPage {
  designs: MyDesign[];
  /** Everything matching the filter, not just this page. */
  total: number;
  /** Live links across the whole shelf, so the tab can label itself. */
  sharedCount: number;
}

export type Scope = "all" | "shared";
export type Sort = "recent" | "name";

async function refusal(response: Response, fallback: string): Promise<string> {
  const payload: unknown = await response.json().catch(() => null);
  const data =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : {};
  return typeof data.error === "string" ? data.error : fallback;
}

export async function listMyDesigns(filter: {
  search?: string;
  scope?: Scope;
  sort?: Sort;
} = {}): Promise<GalleryPage> {
  const params = new URLSearchParams();
  if (filter.search?.trim()) params.set("q", filter.search.trim());
  if (filter.scope === "shared") params.set("scope", "shared");
  if (filter.sort === "name") params.set("sort", "name");

  const query = params.toString();
  const response = await fetch(`/api/gallery${query ? `?${query}` : ""}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(await refusal(response, "Galeri gagal dimuat."));
  }
  return (await response.json()) as GalleryPage;
}

export async function renameDesign(id: string, title: string): Promise<void> {
  const response = await fetch(`/api/designs/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: title.trim() }),
  });
  if (!response.ok) {
    throw new Error(await refusal(response, "Nama gagal diganti."));
  }
}

/**
 * Copies a design, server-side.
 *
 * The copy is made in the database rather than by reading the design out and
 * posting it back: a design is megabytes of inline photos, and the round trip
 * would be the most expensive possible way to say "again".
 */
export async function duplicateDesign(id: string): Promise<void> {
  const response = await fetch(`/api/designs/${id}/duplicate`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(await refusal(response, "Salinan gagal dibuat."));
  }
}

/** Removes a design. Soft on the server, so "I deleted the wrong one" is fixable. */
export async function deleteDesign(id: string): Promise<void> {
  const response = await fetch(`/api/designs/${id}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(await refusal(response, "Desain gagal dihapus."));
  }
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * "2 jam lalu", from an ISO timestamp.
 *
 * Computed on the client because it depends on the reader's clock — a relative
 * time rendered on the server is stale before it arrives and mismatches on
 * hydration.
 */
export function relativeTime(iso: string): string {
  const elapsed = Date.now() - new Date(iso).getTime();
  if (elapsed < MINUTE) return "baru saja";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} menit lalu`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)} jam lalu`;
  if (elapsed < 2 * DAY) return "kemarin";
  if (elapsed < 30 * DAY) return `${Math.floor(elapsed / DAY)} hari lalu`;
  if (elapsed < 365 * DAY) return `${Math.floor(elapsed / (30 * DAY))} bulan lalu`;
  return `${Math.floor(elapsed / (365 * DAY))} tahun lalu`;
}
