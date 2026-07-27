import type { LibraryCategory } from "@/components/editor/panels/library-panel";
import type { PageBackground } from "@/types/editor";

/** Shared shape for anything listed in a decoration library. */
export interface LibraryItem {
  id: string;
  label: string;
  category: string;
  /** Extra terms the search should match beyond the label. */
  keywords?: string[];
}

export interface StickerItem extends LibraryItem {
  glyph: string;
}

export interface BackgroundItem extends LibraryItem {
  background: PageBackground;
}

export interface TextStyleItem extends LibraryItem {
  text: string;
  fontSize: number;
  fontWeight: number;
  letterSpacing: number;
  fill: string;
}

export const STICKER_CATEGORIES: LibraryCategory[] = [
  { id: "wisuda", label: "Wisuda" },
  { id: "pesta", label: "Pesta" },
  { id: "cinta", label: "Cinta" },
  { id: "alam", label: "Alam" },
];

/**
 * Starter sticker set. Emoji stand in for the illustrated asset library that the
 * backend will serve later; the object model is identical either way.
 */
export const STICKERS: StickerItem[] = [
  { id: "toga", label: "Topi toga", category: "wisuda", glyph: "🎓", keywords: ["graduation", "kampus"] },
  { id: "ijazah", label: "Ijazah", category: "wisuda", glyph: "📜", keywords: ["scroll"] },
  { id: "medali", label: "Medali", category: "wisuda", glyph: "🏅", keywords: ["juara"] },
  { id: "buku", label: "Buku", category: "wisuda", glyph: "📚", keywords: ["belajar"] },
  { id: "konfeti", label: "Konfeti", category: "pesta", glyph: "🎉", keywords: ["party", "rame"] },
  { id: "balon", label: "Balon", category: "pesta", glyph: "🎈", keywords: ["ulang tahun"] },
  { id: "kue", label: "Kue", category: "pesta", glyph: "🎂", keywords: ["ulang tahun", "cake"] },
  { id: "kembang-api", label: "Kembang api", category: "pesta", glyph: "🎆", keywords: ["firework"] },
  { id: "hati", label: "Hati", category: "cinta", glyph: "❤️", keywords: ["love", "sayang"] },
  { id: "hati-ungu", label: "Hati ungu", category: "cinta", glyph: "💜", keywords: ["love"] },
  { id: "cincin", label: "Cincin", category: "cinta", glyph: "💍", keywords: ["wedding", "nikah"] },
  { id: "ciuman", label: "Cium", category: "cinta", glyph: "💋", keywords: ["kiss"] },
  { id: "bunga", label: "Bunga", category: "alam", glyph: "🌸", keywords: ["sakura"] },
  { id: "matahari", label: "Matahari", category: "alam", glyph: "☀️", keywords: ["cerah"] },
  { id: "bintang", label: "Bintang", category: "alam", glyph: "⭐", keywords: ["star"] },
  { id: "pelangi", label: "Pelangi", category: "alam", glyph: "🌈", keywords: ["rainbow"] },
];

export const BACKGROUND_CATEGORIES: LibraryCategory[] = [
  { id: "polos", label: "Polos" },
  { id: "gradasi", label: "Gradasi" },
];

export const BACKGROUNDS: BackgroundItem[] = [
  { id: "putih", label: "Putih", category: "polos", background: { type: "solid", color: "#ffffff" } },
  { id: "krem", label: "Krem", category: "polos", background: { type: "solid", color: "#faf5ef" }, keywords: ["vintage"] },
  { id: "hitam", label: "Hitam", category: "polos", background: { type: "solid", color: "#0f172a" }, keywords: ["gelap"] },
  { id: "navy", label: "Navy", category: "polos", background: { type: "solid", color: "#1e293b" } },
  { id: "rose", label: "Rose", category: "polos", background: { type: "solid", color: "#fecdd3" }, keywords: ["pink"] },
  { id: "mint", label: "Mint", category: "polos", background: { type: "solid", color: "#ccfbf1" }, keywords: ["hijau"] },
  {
    id: "senja",
    label: "Senja",
    category: "gradasi",
    keywords: ["sunset", "jingga"],
    background: { type: "gradient", from: "#fb7185", to: "#fbbf24", angle: 135 },
  },
  {
    id: "lavender",
    label: "Lavender",
    category: "gradasi",
    keywords: ["ungu", "wisuda"],
    background: { type: "gradient", from: "#fdf2f8", to: "#ede9fe", angle: 135 },
  },
  {
    id: "samudra",
    label: "Samudra",
    category: "gradasi",
    keywords: ["biru", "laut"],
    background: { type: "gradient", from: "#38bdf8", to: "#34d399", angle: 135 },
  },
  {
    id: "malam",
    label: "Malam",
    category: "gradasi",
    keywords: ["gelap", "luxury"],
    background: { type: "gradient", from: "#312e81", to: "#0f172a", angle: 160 },
  },
];

export const TEXT_STYLE_CATEGORIES: LibraryCategory[] = [
  { id: "judul", label: "Judul" },
  { id: "caption", label: "Caption" },
];

export const TEXT_STYLES: TextStyleItem[] = [
  {
    id: "judul-tebal",
    label: "Judul tebal",
    category: "judul",
    text: "JUDUL KAMU",
    fontSize: 64,
    fontWeight: 700,
    letterSpacing: 8,
    fill: "#4c1d95",
  },
  {
    id: "judul-halus",
    label: "Judul halus",
    category: "judul",
    text: "Judul kamu",
    fontSize: 56,
    fontWeight: 400,
    letterSpacing: 2,
    fill: "#0f172a",
  },
  {
    id: "caption-kecil",
    label: "Caption kecil",
    category: "caption",
    text: "Tulis caption di sini",
    fontSize: 32,
    fontWeight: 400,
    letterSpacing: 0,
    fill: "#334155",
  },
  {
    id: "tanggal",
    label: "Tanggal",
    category: "caption",
    text: "27 · 07 · 2026",
    fontSize: 36,
    fontWeight: 600,
    letterSpacing: 6,
    fill: "#7c3aed",
    keywords: ["date"],
  },
];

/** Case-insensitive match across label, category and keywords. */
export function matchesSearch(item: LibraryItem, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) return true;

  return [item.label, item.category, ...(item.keywords ?? [])].some((term) =>
    term.toLowerCase().includes(query),
  );
}
