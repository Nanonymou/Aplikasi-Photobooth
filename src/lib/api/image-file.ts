/**
 * Identifies an uploaded image from its own bytes.
 *
 * A browser's `File.type` is taken from the file extension and is trivially
 * wrong — or trivially forged. Sniffing the container instead means the type
 * recorded, the extension stored, and the `Content-Type` served later all
 * describe what is actually there.
 *
 * Dimensions come from the same pass: they are in the header of every format
 * accepted here, and reading them costs nothing next to decoding the pixels.
 */

export type ImageFormat = "jpeg" | "png" | "webp";

export interface ImageInfo {
  format: ImageFormat;
  contentType: string;
  extension: string;
  width: number;
  height: number;
}

const CONTENT_TYPE: Record<ImageFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const EXTENSION: Record<ImageFormat, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
};

function startsWith(bytes: Uint8Array, signature: number[], offset = 0) {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

/** PNG keeps width and height in the IHDR chunk, right after the signature. */
function readPng(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/**
 * JPEG has no fixed header: walk the marker chain to the frame header (SOFn),
 * skipping the metadata segments a phone camera puts in front of it.
 */
function readJpeg(bytes: Uint8Array): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;

  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;

    const marker = bytes[offset + 1];
    // SOF0–SOF15 carry the dimensions; DHT/DAC/RST markers in that range do not.
    const isFrameHeader =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;

    if (isFrameHeader) {
      return {
        height: view.getUint16(offset + 5),
        width: view.getUint16(offset + 7),
      };
    }

    offset += 2 + view.getUint16(offset + 2);
  }

  return null;
}

/**
 * WebP wraps one of three bitstreams in a RIFF container, and each spells its
 * size differently: lossy VP8, lossless VP8L, and the extended VP8X header that
 * animations and alpha use.
 */
function readWebp(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 30) return null;
  const chunk = String.fromCharCode(...bytes.slice(12, 16));

  if (chunk === "VP8 ") {
    // Key frame: 3-byte frame tag, 3-byte start code, then 14-bit dimensions.
    if (!startsWith(bytes, [0x9d, 0x01, 0x2a], 23)) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return {
      width: view.getUint16(26, true) & 0x3fff,
      height: view.getUint16(28, true) & 0x3fff,
    };
  }

  if (chunk === "VP8L") {
    if (bytes[20] !== 0x2f) return null;
    const bits =
      bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }

  if (chunk === "VP8X") {
    const width = bytes[24] | (bytes[25] << 8) | (bytes[26] << 16);
    const height = bytes[27] | (bytes[28] << 8) | (bytes[29] << 16);
    return { width: width + 1, height: height + 1 };
  }

  return null;
}

/** Returns null when the bytes are not one of the accepted image formats. */
export function identifyImage(bytes: Uint8Array): ImageInfo | null {
  let format: ImageFormat | null = null;
  let size: { width: number; height: number } | null = null;

  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    format = "png";
    size = readPng(bytes);
  } else if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    format = "jpeg";
    size = readJpeg(bytes);
  } else if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    format = "webp";
    size = readWebp(bytes);
  }

  if (!format || !size || size.width < 1 || size.height < 1) return null;

  return {
    format,
    contentType: CONTENT_TYPE[format],
    extension: EXTENSION[format],
    ...size,
  };
}
