/**
 * Quick-share helpers.
 *
 * Sharing needs an upload service to hand out a public URL; that lands with the
 * backend. Until then every link here is a stand-in built from the project id,
 * so the flow — link, QR, hand-off to an app — can be designed and clicked
 * through end to end, and only the URL source has to change later.
 *
 * The hand-off itself is real: intent URLs open the actual apps, and where the
 * browser supports it the picture is passed straight to the system share sheet.
 */

const SHARE_ORIGIN = "https://framestudio.id/s";

/** Stable short code so the same project always shows the same mock link. */
export function shareCode(projectId: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < projectId.length; index += 1) {
    hash ^= projectId.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, "0").slice(0, 7);
}

export function shareLink(projectId: string): string {
  return `${SHARE_ORIGIN}/${shareCode(projectId)}`;
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
