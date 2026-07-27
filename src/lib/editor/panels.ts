import {
  Camera,
  Frame,
  Layers,
  LayoutTemplate,
  Palette,
  Sparkles,
  Sticker,
  Type,
  type LucideIcon,
} from "lucide-react";

import type { PanelId } from "@/types/editor";

export interface PanelDefinition {
  id: PanelId;
  label: string;
  icon: LucideIcon;
  /** Shown as the panel header subtitle. */
  hint: string;
}

/** Order of the left tool rail, top to bottom. */
export const EDITOR_PANELS: PanelDefinition[] = [
  {
    id: "template",
    label: "Template",
    icon: LayoutTemplate,
    hint: "Mulai dari desain siap pakai",
  },
  {
    id: "frame",
    label: "Frame",
    icon: Frame,
    hint: "Susun slot foto sesukamu",
  },
  {
    id: "photo",
    label: "Foto",
    icon: Camera,
    hint: "Ambil dari webcam atau unggah",
  },
  { id: "text", label: "Teks", icon: Type, hint: "Judul, caption, dan tanggal" },
  {
    id: "sticker",
    label: "Stiker",
    icon: Sticker,
    hint: "Dekorasi dan ilustrasi",
  },
  {
    id: "background",
    label: "Latar",
    icon: Palette,
    hint: "Warna, gradasi, dan tekstur",
  },
  { id: "ai", label: "AI", icon: Sparkles, hint: "Perbaiki foto otomatis" },
  {
    id: "layers",
    label: "Lapisan",
    icon: Layers,
    hint: "Urutan objek di halaman",
  },
];

export function getPanel(id: PanelId): PanelDefinition {
  const panel = EDITOR_PANELS.find((item) => item.id === id);
  if (!panel) throw new Error(`Unknown editor panel: ${id}`);
  return panel;
}
