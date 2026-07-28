import "server-only";

import sharp from "sharp";

import { jpegToPdf } from "@/lib/editor/pdf";
import type { ExportFormat } from "@/lib/editor/export";

/**
 * Turns a rendered page into the file someone asked for.
 *
 * The renderer produces one thing — RGBA pixels — and every format is a
 * different way of writing them down. Keeping that split means the renderer
 * never learns about encoders, and adding a format is a case in one switch
 * rather than a second render path.
 *
 * The format catalogue itself (labels, extensions, which ones keep an alpha
 * channel) is shared with the editor's export dialog, so the server cannot
 * offer something the panel does not know how to name.
 */

export interface ConversionOptions {
  format: ExportFormat;
  /** 0–1 for the lossy encoders; PNG ignores it. */
  quality: number;
  /** Keep the alpha channel where the format has one. */
  transparent: boolean;
  /** Needed by PDF, which sizes its page in inches. */
  dpi: number;
}

export interface ConvertedFile {
  data: Buffer;
  contentType: string;
  extension: string;
}

/** White, because that is what paper is — and what a transparent PNG becomes. */
const FLATTEN = { r: 255, g: 255, b: 255 };

export async function convertRender(
  png: Buffer,
  { format, quality, transparent, dpi }: ConversionOptions,
): Promise<ConvertedFile> {
  const keepAlpha = transparent && (format === "png" || format === "webp");
  const percent = Math.round(Math.min(1, Math.max(0, quality)) * 100);

  // Formats without an alpha channel must be composited over something, or the
  // encoder decides for them — and its choice is usually black.
  const base = keepAlpha ? sharp(png) : sharp(png).flatten({ background: FLATTEN });

  switch (format) {
    case "png":
      return {
        data: await base.png({ compressionLevel: 9 }).toBuffer(),
        contentType: "image/png",
        extension: "png",
      };

    case "jpeg":
      return {
        data: await base.jpeg({ quality: percent }).toBuffer(),
        contentType: "image/jpeg",
        extension: "jpg",
      };

    case "webp":
      return {
        data: await base.webp({ quality: percent }).toBuffer(),
        contentType: "image/webp",
        extension: "webp",
      };

    case "pdf": {
      // The PDF carries a JPEG verbatim, so the encode happens here and the
      // writer only wraps it — the same writer the browser download uses.
      const jpeg = await base.jpeg({ quality: percent }).toBuffer();
      const meta = await sharp(jpeg).metadata();

      return {
        data: Buffer.from(
          jpegToPdf(
            new Uint8Array(jpeg),
            meta.width ?? 0,
            meta.height ?? 0,
            dpi,
          ),
        ),
        contentType: "application/pdf",
        extension: "pdf",
      };
    }
  }
}
