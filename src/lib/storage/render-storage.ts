import "server-only";

import { bucketRoot, getBucket, type BlobStorage } from "@/lib/storage/blob-storage";

/**
 * Where finished exports live for a while.
 *
 * A render is a derived file: it can always be made again from the design, so
 * keeping it is a convenience, not a duty. It exists so a caller can be handed
 * a URL instead of megabytes — a print queue, a share link, a download that
 * starts after the dialog is closed — and it is swept up on a timer.
 *
 * PDF is accepted here and not in photo storage, because that is the actual
 * difference between the two buckets: photos are pictures, renders are output.
 */
const EXTENSIONS = ["png", "jpg", "webp", "pdf"] as const;

export function getRenderStorage(): BlobStorage {
  return getBucket("renders", {
    root: bucketRoot("renders"),
    extensions: EXTENSIONS,
    urlPrefix: "/api/export/files",
  });
}
