import "server-only";

import { bucketRoot, getBucket, type BlobStorage } from "@/lib/storage/blob-storage";

/**
 * Files behind share links.
 *
 * A third bucket rather than a reuse of the other two, because a share has its
 * own lifetime: photos follow the guest's history, renders are swept within
 * hours, and a link handed out at a wedding has to keep working for the week it
 * promised. Copying the bytes here is what stops one clock from cutting another
 * short.
 *
 * PDF belongs here too — a print-ready file is a perfectly ordinary thing to
 * hand someone.
 */
const EXTENSIONS = ["png", "jpg", "webp", "pdf"] as const;

export function getShareStorage(): BlobStorage {
  return getBucket("shares", {
    root: bucketRoot("shares"),
    extensions: EXTENSIONS,
    urlPrefix: "/s",
  });
}
