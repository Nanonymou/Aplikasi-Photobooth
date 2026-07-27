import {
  Crop,
  LayoutDashboard,
  Scissors,
  Smile,
  SunMedium,
  Waves,
  type LucideIcon,
} from "lucide-react";

/** What a tool needs selected before it can run. */
export type AiToolTarget =
  /** A photo slot that already has a photo in it. */
  | "photo"
  /** The whole page — layout suggestions do not need a selection. */
  | "page";

export interface AiTool {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  target: AiToolTarget;
  /** Rough wall-clock cost, shown so long jobs are not a surprise. */
  estimatedSeconds: number;
}

/**
 * The AI toolbox.
 *
 * The catalogue is defined here so the panel, the job runner and (later) the
 * server route all agree on tool ids without duplicating labels.
 */
export const AI_TOOLS: AiTool[] = [
  {
    id: "remove-background",
    label: "Hapus latar belakang",
    description: "Pisahkan orang dari latarnya, satu klik.",
    icon: Scissors,
    target: "photo",
    estimatedSeconds: 8,
  },
  {
    id: "enhance-face",
    label: "Perbaikan wajah",
    description: "Pertajam wajah yang buram atau terlalu gelap.",
    icon: Smile,
    target: "photo",
    estimatedSeconds: 6,
  },
  {
    id: "color-correct",
    label: "Koreksi warna",
    description: "Seimbangkan kecerahan, kontras, dan saturasi.",
    icon: SunMedium,
    target: "photo",
    estimatedSeconds: 3,
  },
  {
    id: "denoise",
    label: "Kurangi noise",
    description: "Haluskan bintik pada foto yang diambil di tempat gelap.",
    icon: Waves,
    target: "photo",
    estimatedSeconds: 4,
  },
  {
    id: "smart-crop",
    label: "Smart crop",
    description: "Geser foto agar wajah pas di tengah slot.",
    icon: Crop,
    target: "photo",
    estimatedSeconds: 3,
  },
  {
    id: "auto-layout",
    label: "Rekomendasi tata letak",
    description: "Usulkan susunan slot yang lebih seimbang.",
    icon: LayoutDashboard,
    target: "page",
    estimatedSeconds: 5,
  },
];

export function getAiTool(id: string): AiTool | undefined {
  return AI_TOOLS.find((tool) => tool.id === id);
}
