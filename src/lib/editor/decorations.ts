import type { LibraryCategory } from "@/components/editor/panels/library-panel";
import type {
  PageBackground,
  TextGradient,
  TextShadow,
} from "@/types/editor";

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
  gradient?: TextGradient;
  stroke?: string;
  strokeWidth?: number;
  shadow?: TextShadow;
  /** Degrees of baseline arc; positive bulges upward. */
  curve?: number;
  italic?: boolean;
}

export const STICKER_CATEGORIES: LibraryCategory[] = [
  { id: "wisuda", label: "Wisuda" },
  { id: "pesta", label: "Pesta" },
  { id: "cinta", label: "Cinta" },
  { id: "alam", label: "Alam" },
  { id: "cuaca", label: "Cuaca" },
  { id: "hewan", label: "Hewan" },
  { id: "makanan", label: "Makanan" },
  { id: "aktivitas", label: "Aktivitas" },
  { id: "simbol", label: "Simbol" },
];

/**
 * Sticker catalogue. Emoji stand in for the illustrated asset library the
 * backend will serve; the object model is identical either way, so swapping
 * in real artwork later is a data change rather than a code change.
 */
export const STICKERS: StickerItem[] = [
  { id: "toga", label: "Topi toga", category: "wisuda", glyph: "🎓", keywords: ["graduation", "kampus", "sarjana"] },
  { id: "ijazah", label: "Ijazah", category: "wisuda", glyph: "📜", keywords: ["scroll", "gulungan"] },
  { id: "medali", label: "Medali", category: "wisuda", glyph: "🏅", keywords: ["juara", "penghargaan"] },
  { id: "piala", label: "Piala", category: "wisuda", glyph: "🏆", keywords: ["trofi", "juara"] },
  { id: "buku", label: "Buku", category: "wisuda", glyph: "📚", keywords: ["belajar", "pustaka"] },
  { id: "pensil", label: "Pensil", category: "wisuda", glyph: "✏️", keywords: ["tulis", "sekolah"] },
  { id: "sekolah", label: "Sekolah", category: "wisuda", glyph: "🏫", keywords: ["kampus", "gedung"] },
  { id: "mikroskop", label: "Mikroskop", category: "wisuda", glyph: "🔬", keywords: ["sains", "lab"] },
  { id: "konfeti", label: "Konfeti", category: "pesta", glyph: "🎉", keywords: ["party", "rame", "perayaan"] },
  { id: "terompet", label: "Terompet pesta", category: "pesta", glyph: "🎊", keywords: ["party", "perayaan"] },
  { id: "balon", label: "Balon", category: "pesta", glyph: "🎈", keywords: ["ulang tahun", "birthday"] },
  { id: "kue", label: "Kue ulang tahun", category: "pesta", glyph: "🎂", keywords: ["birthday", "cake"] },
  { id: "kembang-api", label: "Kembang api", category: "pesta", glyph: "🎆", keywords: ["firework", "malam"] },
  { id: "sparkler", label: "Sparkler", category: "pesta", glyph: "🎇", keywords: ["firework", "kembang api"] },
  { id: "kado", label: "Kado", category: "pesta", glyph: "🎁", keywords: ["hadiah", "gift"] },
  { id: "lilin", label: "Lilin", category: "pesta", glyph: "🕯️", keywords: ["candle", "romantis"] },
  { id: "sampanye", label: "Sampanye", category: "pesta", glyph: "🍾", keywords: ["toast", "rayakan"] },
  { id: "gelas", label: "Bersulang", category: "pesta", glyph: "🥂", keywords: ["toast", "cheers"] },
  { id: "topi-pesta", label: "Topi pesta", category: "pesta", glyph: "🥳", keywords: ["party", "wajah"] },
  { id: "disko", label: "Bola disko", category: "pesta", glyph: "🪩", keywords: ["dansa", "club"] },
  { id: "hati", label: "Hati merah", category: "cinta", glyph: "❤️", keywords: ["love", "sayang"] },
  { id: "hati-ungu", label: "Hati ungu", category: "cinta", glyph: "💜", keywords: ["love"] },
  { id: "hati-pink", label: "Hati pink", category: "cinta", glyph: "💗", keywords: ["love", "imut"] },
  { id: "dua-hati", label: "Dua hati", category: "cinta", glyph: "💕", keywords: ["love", "pasangan"] },
  { id: "hati-berkilau", label: "Hati berkilau", category: "cinta", glyph: "💖", keywords: ["love", "sparkle"] },
  { id: "cincin", label: "Cincin", category: "cinta", glyph: "💍", keywords: ["wedding", "nikah", "lamaran"] },
  { id: "ciuman", label: "Bibir", category: "cinta", glyph: "💋", keywords: ["kiss", "cium"] },
  { id: "pasangan", label: "Pasangan", category: "cinta", glyph: "💑", keywords: ["couple", "berdua"] },
  { id: "mawar", label: "Mawar", category: "cinta", glyph: "🌹", keywords: ["bunga", "rose", "romantis"] },
  { id: "surat-cinta", label: "Surat cinta", category: "cinta", glyph: "💌", keywords: ["love letter"] },
  { id: "bunga", label: "Bunga sakura", category: "alam", glyph: "🌸", keywords: ["sakura", "pink"] },
  { id: "tulip", label: "Tulip", category: "alam", glyph: "🌷", keywords: ["bunga"] },
  { id: "matahari-bunga", label: "Bunga matahari", category: "alam", glyph: "🌻", keywords: ["sunflower", "kuning"] },
  { id: "daun", label: "Daun", category: "alam", glyph: "🍃", keywords: ["hijau", "angin"] },
  { id: "pohon", label: "Pohon", category: "alam", glyph: "🌳", keywords: ["hijau", "taman"] },
  { id: "kaktus", label: "Kaktus", category: "alam", glyph: "🌵", keywords: ["gurun", "tanaman"] },
  { id: "pantai", label: "Pantai", category: "alam", glyph: "🏖️", keywords: ["liburan", "laut"] },
  { id: "gunung", label: "Gunung", category: "alam", glyph: "⛰️", keywords: ["hiking", "alam"] },
  { id: "bintang", label: "Bintang", category: "alam", glyph: "⭐", keywords: ["star", "malam"] },
  { id: "bulan", label: "Bulan", category: "alam", glyph: "🌙", keywords: ["malam", "night"] },
  { id: "matahari", label: "Matahari", category: "cuaca", glyph: "☀️", keywords: ["cerah", "panas"] },
  { id: "awan", label: "Awan", category: "cuaca", glyph: "☁️", keywords: ["mendung"] },
  { id: "hujan", label: "Hujan", category: "cuaca", glyph: "🌧️", keywords: ["rain", "basah"] },
  { id: "salju", label: "Salju", category: "cuaca", glyph: "❄️", keywords: ["snow", "dingin", "natal"] },
  { id: "pelangi", label: "Pelangi", category: "cuaca", glyph: "🌈", keywords: ["rainbow", "warna"] },
  { id: "petir", label: "Petir", category: "cuaca", glyph: "⚡", keywords: ["kilat", "badai"] },
  { id: "api", label: "Api", category: "cuaca", glyph: "🔥", keywords: ["hot", "keren"] },
  { id: "gelembung", label: "Gelembung", category: "cuaca", glyph: "🫧", keywords: ["bubble", "sabun"] },
  { id: "kucing", label: "Kucing", category: "hewan", glyph: "🐱", keywords: ["cat", "imut"] },
  { id: "anjing", label: "Anjing", category: "hewan", glyph: "🐶", keywords: ["dog", "imut"] },
  { id: "panda", label: "Panda", category: "hewan", glyph: "🐼", keywords: ["imut"] },
  { id: "kelinci", label: "Kelinci", category: "hewan", glyph: "🐰", keywords: ["bunny", "imut"] },
  { id: "beruang", label: "Beruang", category: "hewan", glyph: "🐻", keywords: ["bear"] },
  { id: "kupu-kupu", label: "Kupu-kupu", category: "hewan", glyph: "🦋", keywords: ["butterfly", "cantik"] },
  { id: "burung", label: "Burung", category: "hewan", glyph: "🐦", keywords: ["bird"] },
  { id: "unicorn", label: "Unicorn", category: "hewan", glyph: "🦄", keywords: ["fantasi", "pelangi"] },
  { id: "es-krim", label: "Es krim", category: "makanan", glyph: "🍦", keywords: ["dessert", "manis"] },
  { id: "donat", label: "Donat", category: "makanan", glyph: "🍩", keywords: ["manis", "snack"] },
  { id: "kopi", label: "Kopi", category: "makanan", glyph: "☕", keywords: ["coffee", "ngopi"] },
  { id: "boba", label: "Boba", category: "makanan", glyph: "🧋", keywords: ["bubble tea", "minuman"] },
  { id: "pizza", label: "Pizza", category: "makanan", glyph: "🍕", keywords: ["makan"] },
  { id: "permen", label: "Permen", category: "makanan", glyph: "🍬", keywords: ["manis", "candy"] },
  { id: "semangka", label: "Semangka", category: "makanan", glyph: "🍉", keywords: ["buah", "segar"] },
  { id: "stroberi", label: "Stroberi", category: "makanan", glyph: "🍓", keywords: ["buah", "manis"] },
  { id: "kamera", label: "Kamera", category: "aktivitas", glyph: "📷", keywords: ["foto", "photobooth"] },
  { id: "film", label: "Klaper film", category: "aktivitas", glyph: "🎬", keywords: ["video", "sinema"] },
  { id: "musik", label: "Not musik", category: "aktivitas", glyph: "🎵", keywords: ["lagu", "music"] },
  { id: "gitar", label: "Gitar", category: "aktivitas", glyph: "🎸", keywords: ["musik", "band"] },
  { id: "mikrofon", label: "Mikrofon", category: "aktivitas", glyph: "🎤", keywords: ["karaoke", "nyanyi"] },
  { id: "pesawat", label: "Pesawat", category: "aktivitas", glyph: "✈️", keywords: ["travel", "liburan"] },
  { id: "koper", label: "Koper", category: "aktivitas", glyph: "🧳", keywords: ["travel", "liburan"] },
  { id: "game", label: "Stik game", category: "aktivitas", glyph: "🎮", keywords: ["gaming", "main"] },
  { id: "kilau", label: "Kilau", category: "simbol", glyph: "✨", keywords: ["sparkle", "berkilau"] },
  { id: "percikan", label: "Percikan", category: "simbol", glyph: "💫", keywords: ["dizzy", "kilau"] },
  { id: "mahkota", label: "Mahkota", category: "simbol", glyph: "👑", keywords: ["raja", "ratu", "premium"] },
  { id: "jempol", label: "Jempol", category: "simbol", glyph: "👍", keywords: ["oke", "bagus"] },
  { id: "peace", label: "Peace", category: "simbol", glyph: "✌️", keywords: ["damai", "dua jari"] },
  { id: "tos", label: "Tos", category: "simbol", glyph: "🙌", keywords: ["hore", "rayakan"] },
  { id: "centang", label: "Centang", category: "simbol", glyph: "✅", keywords: ["selesai", "oke"] },
  { id: "tanda-seru", label: "Tanda seru", category: "simbol", glyph: "❗", keywords: ["penting"] },
];

export const BACKGROUND_CATEGORIES: LibraryCategory[] = [
  { id: "polos", label: "Polos" },
  { id: "gradasi", label: "Gradasi" },
  { id: "pola", label: "Pola" },
];

export const BACKGROUNDS: BackgroundItem[] = [
  { id: "putih", label: "Putih", category: "polos", background: { type: "solid", color: "#ffffff" } },
  { id: "krem", label: "Krem", category: "polos", keywords: ["vintage", "hangat"], background: { type: "solid", color: "#faf5ef" } },
  { id: "abu", label: "Abu muda", category: "polos", keywords: ["netral"], background: { type: "solid", color: "#e2e8f0" } },
  { id: "hitam", label: "Hitam", category: "polos", keywords: ["gelap", "dark"], background: { type: "solid", color: "#0f172a" } },
  { id: "navy", label: "Navy", category: "polos", keywords: ["biru tua"], background: { type: "solid", color: "#1e293b" } },
  { id: "rose", label: "Rose", category: "polos", keywords: ["pink", "lembut"], background: { type: "solid", color: "#fecdd3" } },
  { id: "mint", label: "Mint", category: "polos", keywords: ["hijau", "segar"], background: { type: "solid", color: "#ccfbf1" } },
  { id: "lavender-polos", label: "Lavender", category: "polos", keywords: ["ungu"], background: { type: "solid", color: "#ede9fe" } },
  { id: "kuning", label: "Kuning lembut", category: "polos", keywords: ["cerah"], background: { type: "solid", color: "#fef3c7" } },
  { id: "terakota", label: "Terakota", category: "polos", keywords: ["earth", "bata"], background: { type: "solid", color: "#e7c6a5" } },

  { id: "senja", label: "Senja", category: "gradasi", keywords: ["sunset", "jingga"], background: { type: "gradient", from: "#fb7185", to: "#fbbf24", angle: 135 } },
  { id: "lavender", label: "Lavender lembut", category: "gradasi", keywords: ["ungu", "wisuda"], background: { type: "gradient", from: "#fdf2f8", to: "#ede9fe", angle: 135 } },
  { id: "samudra", label: "Samudra", category: "gradasi", keywords: ["biru", "laut"], background: { type: "gradient", from: "#38bdf8", to: "#34d399", angle: 135 } },
  { id: "malam", label: "Malam", category: "gradasi", keywords: ["gelap", "luxury"], background: { type: "gradient", from: "#312e81", to: "#0f172a", angle: 160 } },
  { id: "permen", label: "Permen kapas", category: "gradasi", keywords: ["pink", "biru", "pastel"], background: { type: "gradient", from: "#f9a8d4", to: "#a5b4fc", angle: 120 } },
  { id: "emas", label: "Emas", category: "gradasi", keywords: ["mewah", "gold"], background: { type: "gradient", from: "#fde68a", to: "#d97706", angle: 145 } },
  { id: "hutan", label: "Hutan", category: "gradasi", keywords: ["hijau", "alam"], background: { type: "gradient", from: "#86efac", to: "#065f46", angle: 150 } },
  { id: "neon", label: "Neon", category: "gradasi", keywords: ["gaming", "cerah"], background: { type: "gradient", from: "#a855f7", to: "#22d3ee", angle: 110 } },

  { id: "pola-titik", label: "Titik", category: "pola", keywords: ["polkadot", "bulat"], background: { type: "pattern", pattern: "titik", foreground: "#c4b5fd", background: "#faf5ff", scale: 1 } },
  { id: "pola-kotak", label: "Kotak", category: "pola", keywords: ["grid", "garis"], background: { type: "pattern", pattern: "kotak", foreground: "#cbd5e1", background: "#ffffff", scale: 1 } },
  { id: "pola-garis", label: "Garis miring", category: "pola", keywords: ["stripe", "diagonal"], background: { type: "pattern", pattern: "garis", foreground: "#fecdd3", background: "#fff1f2", scale: 1 } },
  { id: "pola-catur", label: "Papan catur", category: "pola", keywords: ["retro", "kotak"], background: { type: "pattern", pattern: "papan-catur", foreground: "#e2e8f0", background: "#ffffff", scale: 1 } },
  { id: "pola-konfeti", label: "Konfeti", category: "pola", keywords: ["pesta", "ulang tahun"], background: { type: "pattern", pattern: "konfeti", foreground: "#fbbf24", background: "#1e293b", scale: 1 } },
  { id: "pola-hati", label: "Hati kecil", category: "pola", keywords: ["cinta", "wedding"], background: { type: "pattern", pattern: "hati", foreground: "#fda4af", background: "#fff1f2", scale: 1 } },
];

export const TEXT_STYLE_CATEGORIES: LibraryCategory[] = [
  { id: "judul", label: "Judul" },
  { id: "artistik", label: "Artistik" },
  { id: "lengkung", label: "Lengkung" },
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
    id: "judul-miring",
    label: "Judul miring",
    category: "judul",
    keywords: ["italic", "elegan"],
    text: "Momen Terbaik",
    fontSize: 58,
    fontWeight: 400,
    letterSpacing: 1,
    fill: "#1e293b",
    italic: true,
  },
  {
    id: "gradasi-senja",
    label: "Gradasi senja",
    category: "artistik",
    keywords: ["gradient", "warna", "sunset"],
    text: "SUNSET",
    fontSize: 72,
    fontWeight: 700,
    letterSpacing: 6,
    fill: "#fb7185",
    gradient: { from: "#fb7185", to: "#fbbf24", angle: 135 },
  },
  {
    id: "gradasi-ungu",
    label: "Gradasi ungu",
    category: "artistik",
    keywords: ["gradient", "wisuda"],
    text: "WISUDA",
    fontSize: 72,
    fontWeight: 700,
    letterSpacing: 10,
    fill: "#a855f7",
    gradient: { from: "#a855f7", to: "#38bdf8", angle: 90 },
  },
  {
    id: "outline",
    label: "Outline",
    category: "artistik",
    keywords: ["garis", "kosong", "stroke"],
    text: "OUTLINE",
    fontSize: 72,
    fontWeight: 700,
    letterSpacing: 6,
    fill: "#ffffff",
    stroke: "#0f172a",
    strokeWidth: 4,
  },
  {
    id: "bayangan",
    label: "Bayangan tebal",
    category: "artistik",
    keywords: ["shadow", "drop"],
    text: "POP!",
    fontSize: 84,
    fontWeight: 700,
    letterSpacing: 4,
    fill: "#fbbf24",
    shadow: { color: "#0f172a", blur: 0, offsetX: 8, offsetY: 8 },
  },
  {
    id: "glow",
    label: "Glow lembut",
    category: "artistik",
    keywords: ["cahaya", "neon"],
    text: "GLOW",
    fontSize: 76,
    fontWeight: 700,
    letterSpacing: 8,
    fill: "#f0abfc",
    shadow: { color: "#a855f7", blur: 28, offsetX: 0, offsetY: 0 },
  },
  {
    id: "lengkung-atas",
    label: "Melengkung ke atas",
    category: "lengkung",
    keywords: ["curve", "arc", "melengkung"],
    text: "SELAMAT WISUDA",
    fontSize: 56,
    fontWeight: 700,
    letterSpacing: 4,
    fill: "#4c1d95",
    curve: 60,
  },
  {
    id: "lengkung-bawah",
    label: "Melengkung ke bawah",
    category: "lengkung",
    keywords: ["curve", "arc", "melengkung"],
    text: "TERIMA KASIH",
    fontSize: 56,
    fontWeight: 700,
    letterSpacing: 4,
    fill: "#0f766e",
    curve: -60,
  },
  {
    id: "lengkung-gradasi",
    label: "Lengkung gradasi",
    category: "lengkung",
    keywords: ["curve", "gradient"],
    text: "HAPPY BIRTHDAY",
    fontSize: 52,
    fontWeight: 700,
    letterSpacing: 3,
    fill: "#fb7185",
    gradient: { from: "#fb7185", to: "#a855f7", angle: 90 },
    curve: 80,
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
  {
    id: "lokasi",
    label: "Lokasi",
    category: "caption",
    keywords: ["tempat", "venue"],
    text: "Bandung, Indonesia",
    fontSize: 30,
    fontWeight: 400,
    letterSpacing: 2,
    fill: "#475569",
    italic: true,
  },
];

/**
 * Folds case and strips diacritics, so "Émas" and "emas" are the same query.
 */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Matches a library item against a free-text query.
 *
 * Every whitespace-separated term must appear somewhere in the item's label,
 * category or keywords — so "hati pink" narrows rather than widening, which is
 * what people expect as they keep typing.
 */
export function matchesSearch(item: LibraryItem, search: string): boolean {
  const terms = normalize(search).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const haystack = normalize(
    [item.label, item.category, ...(item.keywords ?? [])].join(" "),
  );

  return terms.every((term) => haystack.includes(term));
}
