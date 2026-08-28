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
  /** The address, and what every endpoint here is keyed by. */
  slug: string;
  /** The publication's own id, for React keys and the card's tint. */
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
  remixOf?: { slug: string; title: string; author: string } | null;
  likes: number;
  /** Whether *this* visitor has liked it. Null when nobody is identified. */
  liked: boolean | null;
  /** Whether they have saved it. Private to them, unlike the like count. */
  saved: boolean | null;
  publishedAt: string;
}

/** Compact counts, so "1.284" does not eat a card's width. */
export function formatCount(value: number): string {
  if (value < 1000) return String(value);
  const thousands = value / 1000;
  return `${thousands >= 10 ? Math.round(thousands) : thousands.toFixed(1).replace(".", ",")} rb`;
}

/**
 * A colour derived from the id, not stored.
 *
 * The card needs a tint and the design has no colour of its own worth reading —
 * rendering a page of objects to pick a hue for forty cards is not a trade worth
 * making. Deriving it keeps the same design the same colour everywhere, which is
 * all the card actually needs.
 */
export function hueFor(id: string): number {
  let hash = 0;
  for (const character of id) {
    hash = (hash * 31 + character.charCodeAt(0)) % 360;
  }
  return hash;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * "2 minggu lalu", from an ISO timestamp.
 *
 * On the client, because it depends on the reader's clock — a relative time
 * rendered on the server is stale before it arrives and mismatches on hydration.
 */
export function relativeTime(iso: string): string {
  const elapsed = Date.now() - new Date(iso).getTime();
  if (elapsed < HOUR) return "baru saja";
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)} jam lalu`;
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)} hari lalu`;
  if (elapsed < 30 * DAY) return `${Math.floor(elapsed / (7 * DAY))} minggu lalu`;
  if (elapsed < 365 * DAY) return `${Math.floor(elapsed / (30 * DAY))} bulan lalu`;
  return `${Math.floor(elapsed / (365 * DAY))} tahun lalu`;
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

