import type { LibraryCategory } from "@/components/editor/panels/library-panel";
import { createId } from "@/lib/editor/id";
import type { LibraryItem } from "@/lib/editor/decorations";
import type {
  CanvasObject,
  PageBackground,
  SlotPhoto,
  SlotShape,
} from "@/types/editor";

interface TemplateSlot {
  x: number;
  y: number;
  width: number;
  height: number;
  shape?: SlotShape;
  cornerRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  fill?: string;
}

interface TemplateText {
  x: number;
  y: number;
  width: number;
  text: string;
  fontSize: number;
  fontWeight?: number;
  letterSpacing?: number;
  fill: string;
  align?: "left" | "center" | "right";
}

interface TemplateSticker {
  x: number;
  y: number;
  size: number;
  glyph: string;
  rotation?: number;
}

/**
 * A ready-made page: canvas size, background, and everything on it.
 *
 * Templates carry their own page size the way design tools do — picking a
 * photostrip should give you a photostrip-shaped canvas, not squeeze one into
 * whatever was open.
 */
export interface DesignTemplate extends LibraryItem {
  width: number;
  height: number;
  background: PageBackground;
  slots: TemplateSlot[];
  texts?: TemplateText[];
  stickers?: TemplateSticker[];
}

export const TEMPLATE_CATEGORIES: LibraryCategory[] = [
  { id: "wisuda", label: "Wisuda" },
  { id: "ulang-tahun", label: "Ulang tahun" },
  { id: "wedding", label: "Wedding" },
  { id: "retro", label: "Retro" },
  { id: "minimalis", label: "Minimalis" },
];

const WHITE = "#ffffff";

/**
 * Mock catalogue. These stand in for the premium template library the backend
 * will serve; the data shape is what a stored template will look like.
 */
export const TEMPLATES: DesignTemplate[] = [
  {
    id: "wisuda-strip",
    label: "Photostrip Wisuda",
    category: "wisuda",
    keywords: ["graduation", "strip", "toga"],
    width: 1200,
    height: 1800,
    background: { type: "gradient", from: "#fdf2f8", to: "#ede9fe", angle: 135 },
    slots: [
      { x: 100, y: 120, width: 1000, height: 480 },
      { x: 100, y: 640, width: 1000, height: 480 },
      { x: 100, y: 1160, width: 1000, height: 480 },
    ],
    texts: [
      {
        x: 100,
        y: 1680,
        width: 1000,
        text: "WISUDA 2026",
        fontSize: 64,
        fontWeight: 700,
        letterSpacing: 8,
        fill: "#4c1d95",
      },
    ],
    stickers: [{ x: 940, y: 40, size: 140, glyph: "🎓", rotation: -12 }],
  },
  {
    id: "wisuda-kartu",
    label: "Kartu Wisuda",
    category: "wisuda",
    keywords: ["graduation", "landscape", "ucapan"],
    width: 1800,
    height: 1200,
    background: { type: "solid", color: "#0f172a" },
    slots: [
      { x: 120, y: 160, width: 800, height: 880, cornerRadius: 32, borderWidth: 0 },
      {
        x: 1040,
        y: 160,
        width: 360,
        height: 360,
        shape: "circle",
        borderWidth: 12,
        borderColor: "#a78bfa",
      },
    ],
    texts: [
      {
        x: 1040,
        y: 600,
        width: 640,
        text: "Selamat wisuda!",
        fontSize: 56,
        fontWeight: 600,
        fill: "#f8fafc",
        align: "left",
      },
    ],
  },
  {
    id: "ultah-grid",
    label: "Grid Ulang Tahun",
    category: "ulang-tahun",
    keywords: ["birthday", "pesta", "kolase"],
    width: 1200,
    height: 1500,
    background: { type: "gradient", from: "#fb7185", to: "#fbbf24", angle: 135 },
    slots: [
      { x: 90, y: 200, width: 490, height: 490, cornerRadius: 32 },
      { x: 620, y: 200, width: 490, height: 490, cornerRadius: 32 },
      { x: 90, y: 730, width: 490, height: 490, cornerRadius: 32 },
      { x: 620, y: 730, width: 490, height: 490, cornerRadius: 32 },
    ],
    texts: [
      {
        x: 90,
        y: 70,
        width: 1020,
        text: "HAPPY BIRTHDAY",
        fontSize: 72,
        fontWeight: 700,
        letterSpacing: 4,
        fill: WHITE,
      },
    ],
    stickers: [
      { x: 80, y: 1270, size: 150, glyph: "🎂" },
      { x: 970, y: 1270, size: 150, glyph: "🎉", rotation: 14 },
    ],
  },
  {
    id: "ultah-balon",
    label: "Balon Ceria",
    category: "ulang-tahun",
    keywords: ["birthday", "bulat"],
    width: 1200,
    height: 1600,
    background: { type: "solid", color: "#fef3c7" },
    slots: [
      { x: 300, y: 180, width: 600, height: 600, shape: "circle", borderWidth: 16, borderColor: WHITE },
      { x: 150, y: 850, width: 420, height: 420, shape: "circle", borderWidth: 16, borderColor: WHITE },
      { x: 630, y: 850, width: 420, height: 420, shape: "circle", borderWidth: 16, borderColor: WHITE },
    ],
    texts: [
      {
        x: 100,
        y: 1380,
        width: 1000,
        text: "Selamat ulang tahun",
        fontSize: 56,
        fontWeight: 600,
        fill: "#b45309",
      },
    ],
    stickers: [{ x: 60, y: 60, size: 130, glyph: "🎈", rotation: -10 }],
  },
  {
    id: "wedding-hati",
    label: "Cinta Berbingkai",
    category: "wedding",
    keywords: ["nikah", "hati", "love"],
    width: 1200,
    height: 1600,
    background: { type: "solid", color: "#faf5ef" },
    slots: [
      { x: 200, y: 200, width: 800, height: 800, shape: "heart", borderWidth: 10, borderColor: "#f43f5e" },
      { x: 150, y: 1060, width: 420, height: 300, cornerRadius: 20 },
      { x: 630, y: 1060, width: 420, height: 300, cornerRadius: 20 },
    ],
    texts: [
      {
        x: 100,
        y: 1420,
        width: 1000,
        text: "Save The Date",
        fontSize: 60,
        fontWeight: 400,
        letterSpacing: 10,
        fill: "#9f1239",
      },
    ],
    stickers: [{ x: 1000, y: 90, size: 120, glyph: "💍", rotation: 8 }],
  },
  {
    id: "wedding-elegan",
    label: "Elegan Gelap",
    category: "wedding",
    keywords: ["luxury", "mewah", "hitam"],
    width: 1200,
    height: 1800,
    background: { type: "gradient", from: "#312e81", to: "#0f172a", angle: 160 },
    slots: [
      { x: 120, y: 160, width: 960, height: 1080, cornerRadius: 12, borderWidth: 4, borderColor: "#fbbf24" },
      { x: 120, y: 1300, width: 460, height: 320, cornerRadius: 12 },
      { x: 620, y: 1300, width: 460, height: 320, cornerRadius: 12 },
    ],
    texts: [
      {
        x: 120,
        y: 1680,
        width: 960,
        text: "F O R E V E R",
        fontSize: 48,
        fontWeight: 400,
        letterSpacing: 16,
        fill: "#fbbf24",
      },
    ],
  },
  {
    id: "retro-film",
    label: "Film Strip Retro",
    category: "retro",
    keywords: ["vintage", "strip", "klasik"],
    width: 800,
    height: 2000,
    background: { type: "solid", color: "#1c1917" },
    slots: [
      { x: 80, y: 120, width: 640, height: 420, cornerRadius: 0, borderWidth: 0 },
      { x: 80, y: 580, width: 640, height: 420, cornerRadius: 0, borderWidth: 0 },
      { x: 80, y: 1040, width: 640, height: 420, cornerRadius: 0, borderWidth: 0 },
      { x: 80, y: 1500, width: 640, height: 420, cornerRadius: 0, borderWidth: 0 },
    ],
    texts: [
      {
        x: 80,
        y: 1950,
        width: 640,
        text: "KODAK · 400",
        fontSize: 32,
        fontWeight: 600,
        letterSpacing: 6,
        fill: "#fbbf24",
      },
    ],
  },
  {
    id: "retro-polaroid",
    label: "Polaroid Ganda",
    category: "retro",
    keywords: ["vintage", "instan"],
    width: 1200,
    height: 1600,
    background: { type: "solid", color: "#0c4a6e" },
    slots: [
      { x: 150, y: 140, width: 900, height: 620, shape: "polaroid", borderColor: WHITE },
      { x: 150, y: 820, width: 900, height: 620, shape: "polaroid", borderColor: WHITE },
    ],
    texts: [
      {
        x: 150,
        y: 1490,
        width: 900,
        text: "kenangan manis",
        fontSize: 44,
        fontWeight: 400,
        fill: "#e0f2fe",
      },
    ],
  },
  {
    id: "minimalis-tunggal",
    label: "Satu Bingkai",
    category: "minimalis",
    keywords: ["simple", "bersih", "tunggal"],
    width: 1200,
    height: 1500,
    background: { type: "solid", color: WHITE },
    slots: [{ x: 120, y: 120, width: 960, height: 1100, cornerRadius: 8, borderWidth: 0 }],
    texts: [
      {
        x: 120,
        y: 1300,
        width: 960,
        text: "2026",
        fontSize: 52,
        fontWeight: 300,
        letterSpacing: 20,
        fill: "#0f172a",
      },
    ],
  },
  {
    id: "minimalis-tiga",
    label: "Tiga Kolom",
    category: "minimalis",
    keywords: ["simple", "horizontal"],
    width: 1800,
    height: 1000,
    background: { type: "solid", color: "#f8fafc" },
    slots: [
      { x: 80, y: 120, width: 520, height: 700, cornerRadius: 8, borderWidth: 0 },
      { x: 640, y: 120, width: 520, height: 700, cornerRadius: 8, borderWidth: 0 },
      { x: 1200, y: 120, width: 520, height: 700, cornerRadius: 8, borderWidth: 0 },
    ],
    texts: [
      {
        x: 80,
        y: 870,
        width: 1640,
        text: "M O M E N T S",
        fontSize: 40,
        fontWeight: 400,
        letterSpacing: 14,
        fill: "#334155",
      },
    ],
  },
];

export interface InstantiatedTemplate {
  name: string;
  width: number;
  height: number;
  background: PageBackground;
  objects: CanvasObject[];
  templateId: string;
}

/**
 * Turns a template into concrete page content with fresh ids.
 *
 * `existingPhotos` are re-attached to the new slots in order, so switching
 * templates rearranges the design without discarding photos already taken.
 */
export function instantiateTemplate(
  template: DesignTemplate,
  existingPhotos: (SlotPhoto | null)[] = [],
): InstantiatedTemplate {
  const objects: CanvasObject[] = [];

  template.slots.forEach((slot, index) => {
    objects.push({
      id: createId("slot"),
      kind: "slot",
      name: `Slot foto ${index + 1}`,
      x: slot.x,
      y: slot.y,
      width: slot.width,
      height: slot.height,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      shape: slot.shape ?? "rect",
      cornerRadius: slot.cornerRadius ?? 24,
      borderWidth: slot.borderWidth ?? 8,
      borderColor: slot.borderColor ?? WHITE,
      fill: slot.fill ?? "#e2e8f0",
      photo: existingPhotos[index] ?? null,
    });
  });

  template.texts?.forEach((text, index) => {
    objects.push({
      id: createId("text"),
      kind: "text",
      name: index === 0 ? "Judul" : `Teks ${index + 1}`,
      x: text.x,
      y: text.y,
      width: text.width,
      height: Math.round(text.fontSize * 1.4),
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      text: text.text,
      fontFamily: "var(--font-geist-sans)",
      fontSize: text.fontSize,
      fontWeight: text.fontWeight ?? 600,
      letterSpacing: text.letterSpacing ?? 0,
      lineHeight: 1.2,
      align: text.align ?? "center",
      fill: text.fill,
    });
  });

  template.stickers?.forEach((sticker, index) => {
    objects.push({
      id: createId("sticker"),
      kind: "sticker",
      name: `Stiker ${index + 1}`,
      x: sticker.x,
      y: sticker.y,
      width: sticker.size,
      height: sticker.size,
      rotation: sticker.rotation ?? 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: sticker.glyph,
    });
  });

  return {
    name: template.label,
    width: template.width,
    height: template.height,
    background: template.background,
    objects,
    templateId: template.id,
  };
}
