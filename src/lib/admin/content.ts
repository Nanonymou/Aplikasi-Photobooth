"use client";

/**
 * Admin content library.
 *
 * Stand-in for `GET /api/admin/content` — the pustaka an admin curates: frame
 * templates plus the assets that dress them (stickers, backgrounds, text
 * styles). The fields the management grid renders — what it is, which category it
 * files under, whether it is live, and when it last changed. A plain data module
 * so the real endpoint drops in without moving the grid.
 */

/**
 * Every kind the library actually holds.
 *
 * Seven, not four. The console was built against a stand-in that knew about
 * templates, stickers, backgrounds and text styles; the endpoint also serves
 * filters, effects and textures, and rendering one of those crashed the page —
 * the icon lookup returned undefined and React refused the element. A console
 * that manages the library has to know the whole library.
 */
export type ContentType =
  | "template"
  | "sticker"
  | "background"
  | "textstyle"
  | "filter"
  | "effect"
  | "texture";

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  template: "Template",
  sticker: "Stiker",
  background: "Latar",
  textstyle: "Gaya teks",
  filter: "Filter",
  effect: "Efek",
  texture: "Tekstur",
};

export type ContentStatus = "published" | "draft";

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  published: "Terbit",
  draft: "Draf",
};

export interface ContentItem {
  id: string;
  name: string;
  type: ContentType;
  /** The category's label, for reading. */
  category: string;
  /** Its slug, for writing — the endpoint takes the slug, not the label. */
  categorySlug: string;
  status: ContentStatus;
  premium: boolean;
  /** ISO; the card formats it. */
  updatedAt: string;
}

export interface ContentPage {
  items: ContentItem[];
  /** Everything matching the filter, not just this page. */
  total: number;
  /** Per type, over the whole library, so the strip can label the tabs. */
  counts: Record<ContentType, { total: number; published: number; draft: number }>;
}

async function refusal(response: Response, fallback: string): Promise<string> {
  const payload: unknown = await response.json().catch(() => null);
  const data =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : {};
  return typeof data.error === "string" ? data.error : fallback;
}

interface ApiItem {
  id: string;
  type: ContentType;
  slug: string;
  name: string;
  category: string;
  categorySlug: string;
  status: ContentStatus;
  premium: boolean;
  updatedAt: string;
}

/**
 * The library, filtered by the server.
 *
 * Searching and the type filter stay there, because only the server can see
 * past the page it returned — and this library is 128 items across four kinds,
 * which is exactly the size where client-side filtering starts quietly missing
 * things.
 */
export async function listContent(filter: {
  search?: string;
  type?: ContentType | "all";
} = {}): Promise<ContentPage> {
  const params = new URLSearchParams();
  if (filter.search?.trim()) params.set("q", filter.search.trim());
  if (filter.type && filter.type !== "all") params.set("type", filter.type);

  const query = params.toString();
  const response = await fetch(`/api/admin/content${query ? `?${query}` : ""}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(await refusal(response, "Pustaka gagal dimuat."));
  }

  const data = (await response.json()) as {
    items: ApiItem[];
    total: number;
    counts: ContentPage["counts"];
  };

  return {
    total: data.total,
    counts: data.counts,
    items: data.items.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      category: item.category,
      categorySlug: item.categorySlug,
      status: item.status,
      premium: item.premium,
      updatedAt: item.updatedAt,
    })),
  };
}

/** Publishes or pulls one item. */
export async function setContentStatus(
  item: ContentItem,
  status: ContentStatus,
): Promise<void> {
  const response = await fetch(`/api/admin/content/${item.type}/${item.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    throw new Error(await refusal(response, "Status gagal diubah."));
  }
}

/** Renames one item, or moves it to another category. */
export async function editContent(
  item: ContentItem,
  patch: { label?: string; categorySlug?: string },
): Promise<void> {
  const response = await fetch(`/api/admin/content/${item.type}/${item.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) {
    throw new Error(await refusal(response, "Perubahan gagal disimpan."));
  }
}

export interface ContentUpload {
  type: "sticker" | "background";
  label: string;
  categorySlug: string;
  file: File;
  publish: boolean;
}

/**
 * Adds a sticker or a background.
 *
 * Only those two: a template is a composition and a text style is a set of font
 * fields, and neither is a file somebody uploads. The endpoint says the same, so
 * the form offers the other two kinds as read-only rather than pretending the
 * upload applies to them.
 *
 * `multipart`, not a base64 field in JSON — an image folded into JSON costs a
 * third more bytes for nothing.
 */
export async function uploadContent(input: ContentUpload): Promise<void> {
  const form = new FormData();
  form.set("type", input.type);
  form.set("label", input.label.trim());
  form.set("categorySlug", input.categorySlug);
  form.set("file", input.file);
  form.set("publish", String(input.publish));

  const response = await fetch("/api/admin/content", {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    throw new Error(await refusal(response, "Aset gagal diunggah."));
  }
}

export async function deleteContent(item: ContentItem): Promise<void> {
  const response = await fetch(`/api/admin/content/${item.type}/${item.id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(await refusal(response, "Aset gagal dihapus."));
  }
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Relative time, on the client, where the reader's clock is. */
export function relativeTime(iso: string): string {
  const elapsed = Date.now() - new Date(iso).getTime();
  if (elapsed < MINUTE) return "baru saja";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} menit lalu`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)} jam lalu`;
  if (elapsed < 30 * DAY) return `${Math.floor(elapsed / DAY)} hari lalu`;
  return `${Math.floor(elapsed / (30 * DAY))} bulan lalu`;
}
