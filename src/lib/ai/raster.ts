import "server-only";

import sharp from "sharp";

import { identifyImage } from "@/lib/api/image-file";
import { getPhotoStorage } from "@/lib/storage/photo-storage";

/**
 * Loading and saving pixels for the image tools.
 *
 * Every AI endpoint has the same three steps around whatever it actually does:
 * read a stored photo, work on straight RGBA, write the result back as a new
 * stored photo. Keeping that here means each tool is only its own algorithm,
 * and they all agree on how a result is produced and addressed.
 *
 * Results are new objects, never overwrites. Storage is content-addressed, so
 * the original keeps its key and the client can revert to it — which is exactly
 * what the editor's "kembalikan asli" does.
 */

export interface Raster {
  /** RGBA, four bytes per pixel, no padding. */
  data: Buffer;
  width: number;
  height: number;
}

export class PhotoNotFoundError extends Error {
  constructor() {
    super("Foto tidak ditemukan di penyimpanan.");
    this.name = "PhotoNotFoundError";
  }
}

/** Reads a stored photo into RGBA pixels. */
export async function readRaster(key: string): Promise<Raster> {
  const stored = await getPhotoStorage().read(key);
  if (!stored) throw new PhotoNotFoundError();

  if (!identifyImage(stored)) {
    throw new Error("Berkas tersimpan bukan gambar yang dikenal.");
  }

  const { data, info } = await sharp(Buffer.from(stored))
    // Alpha is always present so a tool can write to it without caring whether
    // the source had one.
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return { data, width: info.width, height: info.height };
}

export interface RasterResult {
  key: string;
  url: string;
  width: number;
  height: number;
  bytes: number;
}

/**
 * Encodes pixels and stores them.
 *
 * PNG when the result carries transparency, JPEG otherwise: a cut-out is
 * pointless without its alpha channel, and an opaque photo is several times
 * smaller as a JPEG.
 */
export async function writeRaster(
  raster: Raster,
  { transparent }: { transparent: boolean },
): Promise<RasterResult> {
  const image = sharp(raster.data, {
    raw: { width: raster.width, height: raster.height, channels: 4 },
  });

  const encoded = transparent
    ? await image.png({ compressionLevel: 9 }).toBuffer()
    : await image.jpeg({ quality: 92 }).toBuffer();

  const storage = getPhotoStorage();
  const stored = await storage.put(
    new Uint8Array(encoded),
    transparent ? "png" : "jpg",
  );

  return {
    key: stored.key,
    url: storage.url(stored.key),
    width: raster.width,
    height: raster.height,
    bytes: stored.bytes,
  };
}
