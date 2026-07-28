import { jpegToPdf } from "@/lib/editor/pdf";
import { getStageSnapshot } from "@/lib/editor/stage-registry";
import type { CanvasPage } from "@/types/editor";

export type ExportFormat = "png" | "jpeg" | "webp" | "pdf";

export interface ExportFormatDefinition {
  id: ExportFormat;
  label: string;
  extension: string;
  mimeType: string;
  /** Only PNG and WEBP carry an alpha channel. */
  supportsTransparency: boolean;
  /** Rough bytes per output pixel, for the size estimate. */
  bytesPerPixel: number;
  hint: string;
}

export const EXPORT_FORMATS: ExportFormatDefinition[] = [
  {
    id: "png",
    label: "PNG",
    extension: "png",
    mimeType: "image/png",
    supportsTransparency: true,
    bytesPerPixel: 1.4,
    hint: "Paling tajam, mendukung latar transparan.",
  },
  {
    id: "jpeg",
    label: "JPEG",
    extension: "jpg",
    mimeType: "image/jpeg",
    supportsTransparency: false,
    bytesPerPixel: 0.28,
    hint: "File kecil, cocok dikirim lewat chat.",
  },
  {
    id: "webp",
    label: "WEBP",
    extension: "webp",
    mimeType: "image/webp",
    supportsTransparency: true,
    bytesPerPixel: 0.2,
    hint: "Paling ringan untuk web, tetap tajam.",
  },
  {
    id: "pdf",
    label: "PDF",
    extension: "pdf",
    mimeType: "application/pdf",
    supportsTransparency: false,
    bytesPerPixel: 0.32,
    hint: "Ukuran cetak terkunci, siap dibawa ke percetakan.",
  },
];

export function getExportFormat(id: ExportFormat): ExportFormatDefinition {
  const format = EXPORT_FORMATS.find((item) => item.id === id);
  if (!format) throw new Error(`Unknown export format: ${id}`);
  return format;
}

/**
 * Output presets.
 *
 * The page's design pixels are treated as 72 DPI, so `scale` and DPI are the
 * same knob: every preset prints at the same physical size, just with more
 * pixels packed into it.
 */
export interface QualityPreset {
  id: string;
  label: string;
  hint: string;
  scale: number;
}

export const QUALITY_PRESETS: QualityPreset[] = [
  { id: "screen", label: "Layar", hint: "72 DPI", scale: 1 },
  { id: "hd", label: "HD", hint: "150 DPI", scale: 2 },
  { id: "print", label: "Cetak", hint: "300 DPI", scale: 4 },
  { id: "large", label: "Cetak besar", hint: "600 DPI", scale: 8 },
];

export const DEFAULT_PRESET_ID = "hd";

export function getQualityPreset(id: string): QualityPreset {
  return (
    QUALITY_PRESETS.find((preset) => preset.id === id) ?? QUALITY_PRESETS[1]
  );
}

/** DPI a page exported at `scale` prints at, given design px are 72 DPI. */
export function dpiFor(scale: number): number {
  return 72 * scale;
}

export interface ExportPlan {
  width: number;
  height: number;
  /** Estimated bytes; the real size depends on the image content. */
  estimatedBytes: number;
  /** Physical print size in centimetres at this preset's DPI. */
  printWidthCm: number;
  printHeightCm: number;
}

export function planExport(
  page: Pick<CanvasPage, "width" | "height">,
  format: ExportFormat,
  scale: number,
): ExportPlan {
  const width = Math.round(page.width * scale);
  const height = Math.round(page.height * scale);
  const dpi = dpiFor(scale);

  return {
    width,
    height,
    estimatedBytes: Math.round(
      width * height * getExportFormat(format).bytesPerPixel,
    ),
    printWidthCm: (width / dpi) * 2.54,
    printHeightCm: (height / dpi) * 2.54,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Filename from the project title, safe for every OS. */
export function exportFilename(title: string, extension: string): string {
  const slug =
    title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "framestudio";

  return `${slug}.${extension}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Gagal membaca hasil kanvas."));
    image.src = src;
  });
}

function toBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Gagal menyusun file.")),
      mimeType,
      quality,
    );
  });
}

/**
 * Rasterises the page at `scale` onto a fresh canvas.
 *
 * The crop is taken from the page rect in stage coordinates, so the surrounding
 * workspace and the transparency checkerboard never end up in the file. Formats
 * without an alpha channel are composited over white first — left to the
 * encoder, transparent areas would come out black.
 */
async function rasterise(
  page: Pick<CanvasPage, "width" | "height">,
  scale: number,
  keepTransparency: boolean,
): Promise<HTMLCanvasElement> {
  const snapshot = getStageSnapshot();
  if (!snapshot) throw new Error("Kanvas belum siap. Buka editor lalu ulangi.");

  const { stage, origin, zoom } = snapshot;
  const source = await loadImage(
    stage.toDataURL({
      x: origin.x,
      y: origin.y,
      width: page.width * zoom,
      height: page.height * zoom,
      // The stage is drawn at the current zoom, so undo it before applying the
      // requested output scale — otherwise the export would inherit the zoom.
      pixelRatio: scale / zoom,
    }),
  );

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(page.width * scale);
  canvas.height = Math.round(page.height * scale);

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser ini tidak mendukung ekspor kanvas.");

  if (!keepTransparency) {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.drawImage(source, 0, 0, canvas.width, canvas.height);

  return canvas;
}

/** Small raster of the page for the dialog's preview. */
export async function renderPreview(
  page: Pick<CanvasPage, "width" | "height">,
  format: ExportFormat,
  maxSize = 360,
): Promise<string> {
  const scale = Math.min(1, maxSize / Math.max(page.width, page.height));
  const canvas = await rasterise(
    page,
    scale,
    getExportFormat(format).supportsTransparency,
  );
  return canvas.toDataURL("image/png");
}

export interface RenderedExport {
  blob: Blob;
  filename: string;
  width: number;
  height: number;
}

/** Renders the page into a downloadable file in the requested format. */
export async function renderExport(
  page: Pick<CanvasPage, "width" | "height">,
  title: string,
  format: ExportFormat,
  scale: number,
): Promise<RenderedExport> {
  const definition = getExportFormat(format);
  const canvas = await rasterise(page, scale, definition.supportsTransparency);
  const filename = exportFilename(title, definition.extension);

  if (format === "pdf") {
    const jpeg = await toBlob(canvas, "image/jpeg", 0.92);
    const blob = jpegToPdf(
      new Uint8Array(await jpeg.arrayBuffer()),
      canvas.width,
      canvas.height,
      dpiFor(scale),
    );
    return { blob, filename, width: canvas.width, height: canvas.height };
  }

  return {
    blob: await toBlob(canvas, definition.mimeType, 0.92),
    filename,
    width: canvas.width,
    height: canvas.height,
  };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking immediately can cancel the download in some browsers; one turn of
  // the event loop is enough for the click to have been picked up.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
