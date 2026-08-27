import "server-only";

import { bucketRoot, getBucket, type BlobStorage } from "@/lib/storage/blob-storage";

/**
 * Where profile pictures live.
 *
 * Its own bucket rather than a corner of the photo one: photos are a guest's
 * captures and expire with their session, while an avatar belongs to an account
 * and outlives every session it was set from. Sweeping one on the other's
 * schedule would delete faces.
 *
 * Content-addressed like the rest, so two people who upload the same picture
 * share one file and re-uploading an unchanged image writes nothing.
 */
const EXTENSIONS = ["webp", "png", "jpg"] as const;

export function getAvatarStorage(): BlobStorage {
  return getBucket("avatars", {
    root: bucketRoot("avatars"),
    extensions: EXTENSIONS,
    urlPrefix: "/api/avatars",
  });
}

/** Only ever `<64 hex chars>.<ext>` — checked before any path is built from it. */
export function isValidAvatarKey(key: string): boolean {
  return getAvatarStorage().isValidKey(key);
}
