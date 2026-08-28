"use client";

/**
 * Quick-share helpers.
 *
 * A share is a rendered picture uploaded to `POST /api/share`, which mints the
 * short code and hands back the address. The link used to be a hash of the
 * project id pointed at `framestudio.id` — a URL that looked right, could be
 * copied, sent, and opened, and led nowhere.
 *
 * The hand-off is real: intent URLs open the actual apps, and where the browser
 * supports it the picture goes straight to the system share sheet.
 */

import {
  defaultExportSettings,
  getQualityPreset,
  renderExport,
  type ProgressCallback,
  type RenderedExport,
} from "@/lib/editor/export";
import type { CanvasPage } from "@/types/editor";

export interface CreatedShare {
  code: string;
  /** The address to hand out, absolute, as the server built it. */
  url: string;
  expiresAt: string;
  filename: string;
  bytes: number;
  contentType: string;
  /**
   * The QR for `url`, rendered by the server that minted the link.
   *
   * It rides along with the response rather than being drawn again here: the
   * server had the address in hand, a data URL of a 1024px code is a few
   * kilobytes, and one picture of the link cannot disagree with another.
   */
  qr: { dataUrl: string; pixels: number };
}

/**
 * Uploads a rendered picture and returns the link to it.
 *
 * The design id rides along so the gallery can mark the design as shared, and
 * so revoking the link later has something to find it by.
 */
export async function createShare(
  blob: Blob,
  filename: string,
  designId?: string,
): Promise<CreatedShare> {
  const form = new FormData();
  form.set("file", blob, filename);
  if (designId) form.set("designId", designId);

  const response = await fetch("/api/share", { method: "POST", body: form });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const data =
      typeof payload === "object" && payload !== null
        ? (payload as Record<string, unknown>)
        : {};
    throw new Error(
      typeof data.error === "string" ? data.error : "Tautan gagal dibuat.",
    );
  }

  return (await response.json()) as CreatedShare;
}

/**
 * The picture a share hands out: the active page as an HD PNG.
 *
 * Lives here rather than in either dialog because both of them publish, and a
 * QR that led to a different rendering than the one the share sheet previewed
 * would be a link to something the user never saw.
 */
export async function renderSharePng(
  page: CanvasPage,
  title: string,
  onProgress?: ProgressCallback,
): Promise<RenderedExport> {
  return renderExport(
    page,
    title,
    {
      ...defaultExportSettings(),
      format: "png",
      scale: getQualityPreset("hd").scale,
    },
    onProgress,
  );
}

export type ShareTargetId =
  | "whatsapp"
  | "telegram"
  | "x"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "email";

/**
 * How a platform can be reached from a browser.
 *
 * `intent` — the platform accepts a pre-filled share URL, so one click is enough.
 * `manual` — Instagram and TikTok only accept uploads from inside their apps, so
 * the best a web app can do is save the picture, put the caption on the
 * clipboard, and open the app for the user to finish. Pretending otherwise would
 * just produce a button that silently does nothing.
 */
export type ShareMode = "intent" | "manual";

export interface ShareTarget {
  id: ShareTargetId;
  label: string;
  mode: ShareMode;
  /** Brand colour, used for the small swatch on the button. */
  color: string;
  /** Where the browser is sent; built per target from link + caption. */
  href: (link: string, caption: string) => string;
  /** Shown after a `manual` hand-off, explaining what is left to do. */
  hint?: string;
}

export const SHARE_TARGETS: ShareTarget[] = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    mode: "intent",
    color: "#25d366",
    href: (link, caption) =>
      `https://wa.me/?text=${encodeURIComponent(`${caption} ${link}`)}`,
  },
  {
    id: "instagram",
    label: "Instagram",
    mode: "manual",
    color: "#e1306c",
    href: () => "https://www.instagram.com/",
    hint: "Gambar tersimpan & caption tersalin — tinggal unggah di Instagram.",
  },
  {
    id: "tiktok",
    label: "TikTok",
    mode: "manual",
    color: "#25f4ee",
    href: () => "https://www.tiktok.com/upload",
    hint: "Gambar tersimpan & caption tersalin — tinggal unggah di TikTok.",
  },
  {
    id: "facebook",
    label: "Facebook",
    mode: "intent",
    color: "#1877f2",
    href: (link) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
  },
  {
    id: "telegram",
    label: "Telegram",
    mode: "intent",
    color: "#2aabee",
    href: (link, caption) =>
      `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(caption)}`,
  },
  {
    id: "x",
    label: "X",
    mode: "intent",
    color: "#71717a",
    href: (link, caption) =>
      `https://x.com/intent/post?url=${encodeURIComponent(link)}&text=${encodeURIComponent(caption)}`,
  },
  {
    id: "email",
    label: "Email",
    mode: "intent",
    color: "#a855f7",
    href: (link, caption) =>
      `mailto:?subject=${encodeURIComponent(caption)}&body=${encodeURIComponent(link)}`,
  },
];

export function shareCaption(title: string): string {
  return `Lihat hasil foto "${title}" dari FrameStudio!`;
}

/** Whether the system share sheet can take this file. */
export function canShareFile(file: File): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  );
}

/**
 * Hands the picture to the operating system's share sheet.
 *
 * Resolves `false` when the user dismisses the sheet, so the caller can stay
 * quiet instead of reporting a failure.
 */
export async function shareFile(
  file: File,
  title: string,
  text: string,
): Promise<boolean> {
  try {
    await navigator.share({ files: [file], title, text });
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return false;
    }
    throw error;
  }
}
