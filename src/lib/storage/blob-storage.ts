import "server-only";

import { createHash } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Content-addressed file storage.
 *
 * Two buckets use this: photos, which a guest keeps, and renders, which are
 * finished exports nobody needs after a few hours. They differ in what they
 * hold and how long, not in how they store it — so the mechanics live here once
 * and each bucket is a configuration.
 *
 * One driver today, the local disk. A hosted deployment wants object storage
 * instead, and that is a second implementation of this interface rather than a
 * change to anything that calls it.
 */

export interface StoredBlob {
  /** `<sha256>.<ext>` — same bytes, same key, stored once. */
  key: string;
  bytes: number;
}

export interface BlobStorage {
  put(data: Uint8Array, extension: string): Promise<StoredBlob>;
  read(key: string): Promise<Uint8Array | null>;
  remove(key: string): Promise<void>;
  /** Path the browser fetches this blob from. */
  url(key: string): string;
  /** Whether a string is a key this bucket could have issued. */
  isValidKey(key: string): boolean;
}

export interface BucketConfig {
  /** Absolute directory the files live under. */
  root: string;
  /** Extensions this bucket accepts, without the dot. */
  extensions: readonly string[];
  /** Route prefix that serves them, without a trailing slash. */
  urlPrefix: string;
}

class LocalDiskStorage implements BlobStorage {
  private readonly pattern: RegExp;

  constructor(private readonly config: BucketConfig) {
    this.pattern = new RegExp(
      `^[0-9a-f]{64}\\.(${config.extensions.join("|")})$`,
    );
  }

  isValidKey(key: string): boolean {
    return this.pattern.test(key);
  }

  /**
   * Fans the files out over 256 directories by the first byte of the hash.
   * A photobooth night produces thousands of files, and a single directory
   * holding all of them is slow to list and unpleasant to inspect.
   */
  private pathFor(key: string): string {
    return path.join(this.config.root, key.slice(0, 2), key);
  }

  async put(data: Uint8Array, extension: string): Promise<StoredBlob> {
    if (!this.config.extensions.includes(extension)) {
      throw new Error(`Ekstensi ${extension} tidak diterima bucket ini.`);
    }

    const key = `${createHash("sha256").update(data).digest("hex")}.${extension}`;
    const target = this.pathFor(key);
    await mkdir(path.dirname(target), { recursive: true });

    // Content-addressed, so an existing file already holds exactly these bytes;
    // rewriting it would only burn IO. Two guests storing the same picture cost
    // one copy.
    try {
      await stat(target);
    } catch {
      await writeFile(target, data);
    }

    return { key, bytes: data.byteLength };
  }

  async read(key: string): Promise<Uint8Array | null> {
    if (!this.isValidKey(key)) return null;
    try {
      return await readFile(this.pathFor(key));
    } catch {
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    if (!this.isValidKey(key)) return;
    await rm(this.pathFor(key), { force: true });
  }

  url(key: string): string {
    return `${this.config.urlPrefix}/${key}`;
  }
}

/**
 * Directory a bucket lives in.
 *
 * Fully static, and deliberately so. Next traces which files a route needs
 * deployed alongside it by following path building, and a directory assembled
 * from an environment variable it cannot read makes it give up and pull the
 * whole project into the bundle.
 *
 * Nothing is lost by fixing it: this driver is for development and self-hosting,
 * where a different location is a mount or a symlink at `.storage`. A managed
 * deployment wants object storage, which is a different implementation of
 * `BlobStorage` and has no directory at all.
 */
export function bucketRoot(bucket: string): string {
  return path.join(process.cwd(), ".storage", bucket);
}

/** Memoised per bucket so one process holds one instance of each. */
const buckets = new Map<string, BlobStorage>();

export function getBucket(name: string, config: BucketConfig): BlobStorage {
  let bucket = buckets.get(name);
  if (!bucket) {
    bucket = new LocalDiskStorage(config);
    buckets.set(name, bucket);
  }
  return bucket;
}
