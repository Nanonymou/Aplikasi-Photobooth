import "server-only";

import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Where uploaded photos live.
 *
 * One interface, one driver today: the local disk. A hosted deployment will
 * want object storage (S3, Supabase Storage) instead, and that is a second
 * driver behind this same three-method contract rather than a rewrite of the
 * endpoints. Writing the contract now is what keeps the endpoints from growing
 * bucket-shaped assumptions.
 */
export interface StoredPhoto {
  /** Content-addressed: same bytes, same key, stored once. */
  key: string;
  bytes: number;
}

export interface PhotoStorage {
  put(data: Uint8Array, extension: string): Promise<StoredPhoto>;
  read(key: string): Promise<Uint8Array | null>;
  /** Path the browser fetches the photo from. */
  url(key: string): string;
}

/** Only ever `<64 hex chars>.<ext>` — checked before any path is built from it. */
const KEY = /^[0-9a-f]{64}\.(jpg|png|webp)$/;

export function isValidKey(key: string): boolean {
  return KEY.test(key);
}

class LocalDiskStorage implements PhotoStorage {
  constructor(private readonly root: string) {}

  /**
   * Fans the files out over 256 directories by the first byte of the hash.
   * A photobooth night produces thousands of shots, and a single directory
   * holding all of them is slow to list and unpleasant to inspect.
   */
  private pathFor(key: string): string {
    return path.join(this.root, key.slice(0, 2), key);
  }

  async put(data: Uint8Array, extension: string): Promise<StoredPhoto> {
    const digest = createHash("sha256").update(data).digest("hex");
    const key = `${digest}.${extension}`;
    const target = this.pathFor(key);

    await mkdir(path.dirname(target), { recursive: true });

    // Content-addressed, so an existing file already holds exactly these bytes;
    // rewriting it would only burn IO. Two guests uploading the same photo cost
    // one copy.
    try {
      await stat(target);
    } catch {
      await writeFile(target, data);
    }

    return { key, bytes: data.byteLength };
  }

  async read(key: string): Promise<Uint8Array | null> {
    if (!isValidKey(key)) return null;
    try {
      return await readFile(this.pathFor(key));
    } catch {
      return null;
    }
  }

  url(key: string): string {
    return `/api/photos/${key}`;
  }
}

let storage: PhotoStorage | undefined;

export function getPhotoStorage(): PhotoStorage {
  if (!storage) {
    // Relative to the project root, and outside `public/` on purpose: serving
    // through a route keeps the door open for an ownership check later, which a
    // statically served directory could never have.
    const root = path.resolve(
      process.env.PHOTO_STORAGE_DIR ?? ".storage/photos",
    );
    storage = new LocalDiskStorage(root);
  }

  return storage;
}
