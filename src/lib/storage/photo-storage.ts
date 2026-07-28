import "server-only";

import { bucketRoot, getBucket, type BlobStorage } from "@/lib/storage/blob-storage";

/**
 * Where photos live: the pictures a guest took, kept until they expire or are
 * removed. Served through a route rather than from `public/` so an ownership
 * check has somewhere to go when accounts arrive.
 */
const EXTENSIONS = ["jpg", "png", "webp"] as const;

export function getPhotoStorage(): BlobStorage {
  return getBucket("photos", {
    root: bucketRoot("photos"),
    extensions: EXTENSIONS,
    urlPrefix: "/api/photos",
  });
}

/** Only ever `<64 hex chars>.<ext>` — checked before any path is built from it. */
export function isValidKey(key: string): boolean {
  return getPhotoStorage().isValidKey(key);
}

export type { BlobStorage, StoredBlob } from "@/lib/storage/blob-storage";
