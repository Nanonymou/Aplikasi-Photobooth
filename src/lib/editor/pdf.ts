/**
 * Minimal single-image PDF writer.
 *
 * A photobooth print is one full-bleed picture per sheet, so the whole document
 * is a page whose only content is a JPEG drawn edge to edge. That is small
 * enough to emit by hand — the alternative is pulling in a full PDF library for
 * five objects and one content stream.
 *
 * The JPEG bytes are passed through untouched (`/DCTDecode`), so the file stays
 * as small as the JPEG the canvas produced.
 */

const encoder = new TextEncoder();

function ascii(text: string): Uint8Array {
  return encoder.encode(text);
}

/** Rounds to 2 decimals — PDF numbers must not carry exponent notation. */
function pt(value: number): string {
  return (Math.round(value * 100) / 100).toString();
}

/**
 * Wraps JPEG bytes in a PDF page of the matching physical size.
 *
 * @param dpi Pixels per inch the image is meant to print at; the page is sized
 *   so the picture lands at exactly that density.
 */
export function jpegToPdf(
  jpeg: Uint8Array,
  pixelWidth: number,
  pixelHeight: number,
  dpi: number,
): Blob {
  // PDF user space is 1/72 inch, whatever the image resolution is.
  const pageWidth = (pixelWidth / dpi) * 72;
  const pageHeight = (pixelHeight / dpi) * 72;

  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;

  function push(chunk: Uint8Array | string) {
    const bytes = typeof chunk === "string" ? ascii(chunk) : chunk;
    chunks.push(bytes);
    length += bytes.length;
  }

  function object(index: number, ...body: (Uint8Array | string)[]) {
    offsets[index] = length;
    push(`${index} 0 obj\n`);
    body.forEach(push);
    push("\nendobj\n");
  }

  push("%PDF-1.4\n");
  // Binary marker comment: tells anything transferring the file to treat it as
  // binary rather than text, which would corrupt the JPEG stream.
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  object(
    3,
    "<< /Type /Page /Parent 2 0 R " +
      `/MediaBox [0 0 ${pt(pageWidth)} ${pt(pageHeight)}] ` +
      "/Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>",
  );

  // `cm` scales the 1×1 unit image up to the full page before drawing it.
  const content = `q ${pt(pageWidth)} 0 0 ${pt(pageHeight)} 0 0 cm /Im0 Do Q`;
  object(
    4,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  );

  object(
    5,
    "<< /Type /XObject /Subtype /Image " +
      `/Width ${pixelWidth} /Height ${pixelHeight} ` +
      "/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode " +
      `/Length ${jpeg.length} >>\nstream\n`,
    jpeg,
    "\nendstream",
  );

  const xrefOffset = length;
  const count = offsets.length; // objects 1..5 plus the free entry at 0

  // Every xref entry is exactly 20 bytes; readers seek by multiplication.
  let xref = `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (let index = 1; index < count; index += 1) {
    xref += `${offsets[index].toString().padStart(10, "0")} 00000 n \n`;
  }
  push(xref);
  push(
    `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  );

  return new Blob(chunks as BlobPart[], { type: "application/pdf" });
}
