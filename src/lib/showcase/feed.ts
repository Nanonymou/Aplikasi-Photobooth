/**
 * The public showcase feed.
 *
 * Stand-in for the designs people have chosen to publish — the wall a visitor
 * lands on before they have an account, and the one place in the app where the
 * work is somebody else's. The real feed (published designs, newest or most
 * used first, paged) replaces this constant without moving the screen.
 *
 * Every entry carries its page size rather than a thumbnail, because the shape
 * *is* the information here: a photostrip, a square card and a wide cover are
 * three different things to make, and a grid that crops them all to 4:3 hides
 * the only thing a browser of templates is actually shopping for.
 */

/**
 * The occasions a design is for.
 *
 * A small closed set, not the tags: tags are what a maker writes, and filtering
 * on free text gives a strip of forty chips that mostly match one design each.
 * These are the handful of answers to "what is it for", which is the question a
 * visitor actually arrives with.
 */
export type CategoryId =
  | "pernikahan"
  | "wisuda"
  | "ulang-tahun"
  | "hari-raya"
  | "komunitas";

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: "pernikahan", label: "Pernikahan" },
  { id: "wisuda", label: "Wisuda" },
  { id: "ulang-tahun", label: "Ulang tahun" },
  { id: "hari-raya", label: "Hari raya" },
  { id: "komunitas", label: "Komunitas" },
];

export type SortId = "terbaru" | "populer" | "remix";

export const SORTS: { id: SortId; label: string }[] = [
  { id: "terbaru", label: "Terbaru" },
  { id: "populer", label: "Terpopuler" },
  { id: "remix", label: "Paling diremix" },
];

export const DEFAULT_SORT: SortId = "populer";

export interface ShowcaseItem {
  id: string;
  title: string;
  author: string;
  category: CategoryId;
  /** Page size in design pixels — the card keeps this ratio. */
  width: number;
  height: number;
  tags: string[];
  /** How many people have started a design from this one. */
  remixes: number;
  /** The design this one was started from, when it was not started from blank. */
  remixOf?: { id: string; title: string; author: string };
  likes: number;
  /** Pre-formatted for display, so there is no clock to hydrate. */
  at: string;
  /** The sortable date behind `at` — ordering on a phrase is not ordering. */
  publishedAt: string;
  /** Card tint. Stored rather than derived: this is data, not a computation. */
  hue: number;
}

export const SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    id: "sc_strip_wisuda",
    title: "Photostrip wisuda klasik",
    author: "Rara Puspita",
    category: "wisuda",
    width: 1200,
    height: 1800,
    tags: ["wisuda", "photostrip"],
    remixes: 1284,
    likes: 342,
    at: "2 hari lalu",
    publishedAt: "2026-08-24T09:00:00.000Z",
    hue: 268,
  },
  {
    id: "sc_kartu_nikah",
    title: "Kartu ucapan pernikahan",
    author: "Studio Kenanga",
    category: "pernikahan",
    width: 1200,
    height: 1200,
    tags: ["pernikahan", "kartu"],
    remixes: 968,
    likes: 511,
    at: "4 hari lalu",
    publishedAt: "2026-08-22T14:30:00.000Z",
    hue: 340,
  },
  {
    id: "sc_sampul_reuni",
    title: "Sampul reuni angkatan",
    author: "Bagas Priyo",
    category: "komunitas",
    width: 1800,
    height: 1200,
    tags: ["reuni", "sampul"],
    remixes: 412,
    likes: 126,
    at: "5 hari lalu",
    publishedAt: "2026-08-21T08:15:00.000Z",
    hue: 200,
  },
  {
    id: "sc_strip_ultah",
    title: "Strip ulang tahun neon",
    author: "Nadia Ayu",
    category: "ulang-tahun",
    width: 1000,
    height: 2000,
    tags: ["ulang tahun", "photostrip"],
    remixes: 2130,
    likes: 874,
    at: "6 hari lalu",
    publishedAt: "2026-08-20T19:45:00.000Z",
    hue: 300,
  },
  {
    id: "sc_polaroid_kantor",
    title: "Polaroid gathering kantor",
    author: "Tim Halo",
    category: "komunitas",
    width: 1200,
    height: 1400,
    tags: ["kantor", "polaroid"],
    remixes: 733,
    likes: 208,
    at: "1 minggu lalu",
    publishedAt: "2026-08-19T11:00:00.000Z",
    hue: 32,
  },
  {
    id: "sc_grid_arisan",
    title: "Grid 2×2 arisan",
    author: "Geng Melati",
    category: "komunitas",
    width: 1400,
    height: 1400,
    tags: ["keluarga", "grid"],
    remixes: 356,
    likes: 97,
    at: "1 minggu lalu",
    publishedAt: "2026-08-18T16:20:00.000Z",
    hue: 150,
  },
  {
    id: "sc_strip_konser",
    title: "Photostrip konser",
    author: "Rio Mahendra",
    category: "komunitas",
    width: 900,
    height: 2100,
    tags: ["konser", "photostrip"],
    remixes: 1502,
    likes: 640,
    at: "2 minggu lalu",
    publishedAt: "2026-08-12T21:10:00.000Z",
    hue: 258,
  },
  {
    id: "sc_kartu_lebaran",
    title: "Kartu Lebaran keluarga",
    author: "Keluarga Hartono",
    category: "hari-raya",
    width: 1200,
    height: 1600,
    tags: ["lebaran", "keluarga"],
    remixes: 1876,
    likes: 921,
    at: "2 minggu lalu",
    publishedAt: "2026-08-11T07:40:00.000Z",
    hue: 96,
  },
  {
    id: "sc_sampul_wisuda",
    title: "Banner wisuda memanjang",
    author: "Kampus Kreatif",
    remixOf: {
      id: "sc_strip_wisuda",
      title: "Photostrip wisuda klasik",
      author: "Rara Puspita",
    },
    category: "wisuda",
    width: 2000,
    height: 900,
    tags: ["wisuda", "banner"],
    remixes: 288,
    likes: 74,
    at: "3 minggu lalu",
    publishedAt: "2026-08-05T10:05:00.000Z",
    hue: 220,
  },
  {
    id: "sc_hati_valentine",
    title: "Frame hati valentine",
    author: "Dewi Anggraini",
    category: "ulang-tahun",
    width: 1200,
    height: 1500,
    tags: ["valentine", "hati"],
    remixes: 1104,
    likes: 588,
    at: "3 minggu lalu",
    publishedAt: "2026-08-04T13:25:00.000Z",
    hue: 350,
  },
  {
    id: "sc_strip_anak",
    title: "Strip ulang tahun anak",
    author: "Mama Kirana",
    remixOf: {
      id: "sc_strip_ultah",
      title: "Strip ulang tahun neon",
      author: "Nadia Ayu",
    },
    category: "ulang-tahun",
    width: 1000,
    height: 1900,
    tags: ["anak", "photostrip"],
    remixes: 645,
    likes: 231,
    at: "1 bulan lalu",
    publishedAt: "2026-07-26T09:30:00.000Z",
    hue: 48,
  },
  {
    id: "sc_kartu_natal",
    title: "Kartu Natal hangat",
    author: "Studio Cemara",
    category: "hari-raya",
    width: 1200,
    height: 1200,
    tags: ["natal", "kartu"],
    remixes: 812,
    likes: 405,
    at: "1 bulan lalu",
    publishedAt: "2026-07-24T18:00:00.000Z",
    hue: 8,
  },
];

/** Compact counts, so "1.284" does not eat a card's width. */
export function formatCount(value: number): string {
  if (value < 1000) return String(value);
  const thousands = value / 1000;
  return `${thousands >= 10 ? Math.round(thousands) : thousands.toFixed(1).replace(".", ",")} rb`;
}

/** Portrait, square or landscape — what the card's label says out loud. */
export function shapeLabel(item: ShowcaseItem): string {
  if (item.width === item.height) return "Persegi";
  return item.width > item.height ? "Horizontal" : "Vertikal";
}

/** A category id from a query string, or null for "everything". */
export function parseCategory(value: string | string[] | undefined): CategoryId | null {
  const first = Array.isArray(value) ? value[0] : value;
  return CATEGORIES.some((category) => category.id === first)
    ? (first as CategoryId)
    : null;
}

/** A sort id from a query string, falling back to the default. */
export function parseSort(value: string | string[] | undefined): SortId {
  const first = Array.isArray(value) ? value[0] : value;
  return SORTS.some((sort) => sort.id === first) ? (first as SortId) : DEFAULT_SORT;
}

/**
 * The wall, filtered and ordered.
 *
 * Pure and separate from the screen so the ordering can be reasoned about — and
 * so the day this feed comes from the server, only where the list comes from
 * changes, not what "terpopuler" means.
 */
export function browseShowcase(
  items: ShowcaseItem[],
  { category, sort }: { category: CategoryId | null; sort: SortId },
): ShowcaseItem[] {
  const filtered = category
    ? items.filter((item) => item.category === category)
    : items;

  const ordered = [...filtered];
  if (sort === "terbaru") {
    ordered.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  } else if (sort === "populer") {
    ordered.sort((a, b) => b.likes - a.likes);
  } else {
    ordered.sort((a, b) => b.remixes - a.remixes);
  }

  return ordered;
}

/** How many designs sit under each category, for the chips' counts. */
export function categoryCounts(items: ShowcaseItem[]): Record<CategoryId, number> {
  const counts = Object.fromEntries(
    CATEGORIES.map((category) => [category.id, 0]),
  ) as Record<CategoryId, number>;

  for (const item of items) counts[item.category] += 1;
  return counts;
}

/** One design by id, for a remix credit that has only the id to go on. */
export function showcaseItem(id: string): ShowcaseItem | null {
  return SHOWCASE_ITEMS.find((item) => item.id === id) ?? null;
}
