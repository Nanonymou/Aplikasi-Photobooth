/**
 * Admin content library.
 *
 * Stand-in for `GET /api/admin/content` — the pustaka an admin curates: frame
 * templates plus the assets that dress them (stickers, backgrounds, text
 * styles). The fields the management grid renders — what it is, which category it
 * files under, whether it is live, and when it last changed. A plain data module
 * so the real endpoint drops in without moving the grid.
 */

export type ContentType = "template" | "sticker" | "background" | "textstyle";

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  template: "Template",
  sticker: "Stiker",
  background: "Latar",
  textstyle: "Gaya teks",
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
  category: string;
  status: ContentStatus;
  /** Pre-formatted, so there is no clock to hydrate. */
  updated: string;
}

export const ADMIN_CONTENT: ContentItem[] = [
  {
    id: "c1",
    name: "Lebaran 2026",
    type: "template",
    category: "Hari raya",
    status: "published",
    updated: "5 menit lalu",
  },
  {
    id: "c2",
    name: "Wisuda Klasik",
    type: "template",
    category: "Wisuda",
    status: "published",
    updated: "2 hari lalu",
  },
  {
    id: "c3",
    name: "Pernikahan Elegan",
    type: "template",
    category: "Pernikahan",
    status: "published",
    updated: "1 minggu lalu",
  },
  {
    id: "c4",
    name: "Tahun Baru Neon",
    type: "template",
    category: "Musiman",
    status: "draft",
    updated: "3 jam lalu",
  },
  {
    id: "c5",
    name: "Ulang Tahun Ceria",
    type: "template",
    category: "Ulang tahun",
    status: "draft",
    updated: "kemarin",
  },
  {
    id: "c6",
    name: "Paket Bunga Musim Semi",
    type: "sticker",
    category: "Paket stiker",
    status: "published",
    updated: "4 hari lalu",
  },
  {
    id: "c7",
    name: "Confetti Warna",
    type: "sticker",
    category: "Paket stiker",
    status: "published",
    updated: "2 minggu lalu",
  },
  {
    id: "c8",
    name: "Emoji Lebaran",
    type: "sticker",
    category: "Paket stiker",
    status: "draft",
    updated: "6 jam lalu",
  },
  {
    id: "c9",
    name: "Studio Pastel",
    type: "background",
    category: "Polos",
    status: "published",
    updated: "1 hari lalu",
  },
  {
    id: "c10",
    name: "Bokeh Malam",
    type: "background",
    category: "Bertekstur",
    status: "published",
    updated: "5 hari lalu",
  },
  {
    id: "c11",
    name: "Gradient Senja",
    type: "background",
    category: "Gradien",
    status: "draft",
    updated: "8 jam lalu",
  },
  {
    id: "c12",
    name: "Judul Tebal",
    type: "textstyle",
    category: "Tajuk",
    status: "published",
    updated: "3 hari lalu",
  },
  {
    id: "c13",
    name: "Skrip Manis",
    type: "textstyle",
    category: "Dekoratif",
    status: "published",
    updated: "1 minggu lalu",
  },
  {
    id: "c14",
    name: "Neon Retro",
    type: "textstyle",
    category: "Dekoratif",
    status: "draft",
    updated: "2 jam lalu",
  },
];

/** Count of items per type, for the summary strip. */
export function contentCounts(): Record<ContentType, number> {
  const counts: Record<ContentType, number> = {
    template: 0,
    sticker: 0,
    background: 0,
    textstyle: 0,
  };
  for (const item of ADMIN_CONTENT) counts[item.type] += 1;
  return counts;
}
