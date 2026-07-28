/**
 * Quick-share helpers.
 *
 * Sharing needs an upload service to hand out a public URL; that lands with the
 * backend. Until then every link here is a stand-in built from the project id,
 * so the flow — link, QR, hand-off to an app — can be designed and clicked
 * through end to end, and only the URL source has to change later.
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

export type ShareTargetId = "whatsapp" | "telegram" | "x" | "email";

export interface ShareTarget {
  id: ShareTargetId;
  label: string;
  /** Where the browser is sent; built per target from link + message. */
  href: (link: string, message: string) => string;
}

export const SHARE_TARGETS: ShareTarget[] = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    href: (link, message) =>
      `https://wa.me/?text=${encodeURIComponent(`${message} ${link}`)}`,
  },
  {
    id: "telegram",
    label: "Telegram",
    href: (link, message) =>
      `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(message)}`,
  },
  {
    id: "x",
    label: "X",
    href: (link, message) =>
      `https://x.com/intent/post?url=${encodeURIComponent(link)}&text=${encodeURIComponent(message)}`,
  },
  {
    id: "email",
    label: "Email",
    href: (link, message) =>
      `mailto:?subject=${encodeURIComponent(message)}&body=${encodeURIComponent(link)}`,
  },
];

export function shareMessage(title: string): string {
  return `Lihat hasil foto "${title}" dari FrameStudio!`;
}

/**
 * Placeholder QR pattern.
 *
 * A real QR needs the encoder that ships with the share service, so this draws
 * a deterministic look-alike instead: same finder squares and quiet zone, module
 * pattern seeded from the link so it stays stable per project. It is labelled as
 * a preview in the UI — it does not scan, and it is not meant to.
 */
export function mockQrModules(seed: string, size = 25): boolean[][] {
  let state = 0x2545f491;
  for (let index = 0; index < seed.length; index += 1) {
    state = Math.imul(state ^ seed.charCodeAt(index), 0x01000193) >>> 0;
  }
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0xffffffff;
  };

  /** Finder squares sit in three corners, 7×7 with a one-module gap around. */
  const inFinder = (row: number, col: number) =>
    (row < 8 && col < 8) ||
    (row < 8 && col >= size - 8) ||
    (row >= size - 8 && col < 8);

  const finderPixel = (row: number, col: number) => {
    const r = row < 8 ? row : size - 1 - row;
    const c = col < 8 ? col : size - 1 - col;
    if (r === 7 || c === 7) return false; // separator gap
    const ring = Math.max(Math.abs(r - 3), Math.abs(c - 3));
    return ring !== 2; // black border, white ring, black core
  };

  const modules: boolean[][] = [];
  for (let row = 0; row < size; row += 1) {
    const line: boolean[] = [];
    for (let col = 0; col < size; col += 1) {
      line.push(inFinder(row, col) ? finderPixel(row, col) : next() > 0.52);
    }
    modules.push(line);
  }
  return modules;
}
