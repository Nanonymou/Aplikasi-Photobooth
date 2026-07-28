import { jpegToPdf } from "@/lib/editor/pdf";
import { EXPORT_CHROME, getStageSnapshot } from "@/lib/editor/stage-registry";
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

/** Free-scale bounds for the resolution slider. */
export const MIN_SCALE = 0.5;
export const MAX_SCALE = 8;

export function getQualityPreset(id: string): QualityPreset {
  return (
    QUALITY_PRESETS.find((preset) => preset.id === id) ?? QUALITY_PRESETS[1]
  );
}

/** Everything the download panel lets the user choose. */
export interface ExportSettings {
  format: ExportFormat;
  /** Output scale relative to the page's design pixels. */
  scale: number;
  /** Encoder quality for lossy formats, 0–1. Ignored by PNG. */
  quality: number;
  /** Keep the alpha channel. Only honoured by formats that have one. */
  transparent: boolean;
}

export function defaultExportSettings(): ExportSettings {
  return {
    format: "png",
    scale: getQualityPreset(DEFAULT_PRESET_ID).scale,
    quality: 0.92,
    transparent: true,
  };
}

/** The preset a scale corresponds to, or `null` when it was set by hand. */
export function matchingPresetId(scale: number): string | null {
  return QUALITY_PRESETS.find((preset) => preset.scale === scale)?.id ?? null;
}

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** Whether the alpha channel survives the chosen format. */
export function keepsTransparency(settings: ExportSettings): boolean {
  return settings.transparent && getExportFormat(settings.format).supportsTransparency;
}

/** Lossless formats ignore the quality slider, so the UI hides it. */
export function isLossy(format: ExportFormat): boolean {
  return format !== "png";
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
  settings: ExportSettings,
): ExportPlan {
  const { format, scale, quality } = settings;
  const width = Math.round(page.width * scale);
  const height = Math.round(page.height * scale);
  const dpi = dpiFor(scale);

  // Lossy encoders roughly track the quality knob; PNG does not care about it.
  const compression = isLossy(format) ? 0.35 + 0.65 * quality : 1;

  return {
    width,
    height,
    estimatedBytes: Math.round(
      width * height * getExportFormat(format).bytesPerPixel * compression,
    ),
    printWidthCm: (width / dpi) * 2.54,
    printHeightCm: (height / dpi) * 2.54,
  };
}

/**
 * Above this many output pixels the render blocks the tab for seconds, so the
 * UI warns before the click rather than after.
 */
export const HEAVY_PIXELS = 40_000_000;

export function isHeavyExport(plan: ExportPlan): boolean {
  return plan.width * plan.height > HEAVY_PIXELS;
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

/** Coarse stages of an export, in the order they run. */
export interface ExportProgress {
  /** 0–1, for the progress bar. */
  value: number;
  label: string;
}

export type ProgressCallback = (progress: ExportProgress) => void;

/**
 * Hands the main thread back long enough for the browser to paint.
 *
 * Rasterising a 300 DPI page blocks for a second or more, and without this the
 * spinner and the stage label would only appear after the work they describe
 * had already finished.
 */
function yieldToPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => setTimeout(resolve, 0));
  });
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

  // Editor chrome shares the stage with the artwork, so it has to step aside for
  // the capture. Konva redraws synchronously inside `toDataURL`, which means the
  // hidden state never reaches the screen.
  const chrome = stage.find(`.${EXPORT_CHROME}`);
  const wasVisible = chrome.map((node) => node.visible());
  chrome.forEach((node) => node.visible(false));

  let captured: string;
  try {
    captured = stage.toDataURL({
      x: origin.x,
      y: origin.y,
      width: page.width * zoom,
      height: page.height * zoom,
      // The stage is drawn at the current zoom, so undo it before applying the
      // requested output scale — otherwise the export would inherit the zoom.
      pixelRatio: scale / zoom,
    });
  } finally {
    chrome.forEach((node, index) => node.visible(wasVisible[index]));
    stage.batchDraw();
  }

  const source = await loadImage(captured);

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
  settings: ExportSettings,
  maxSize = 360,
): Promise<string> {
  const scale = Math.min(1, maxSize / Math.max(page.width, page.height));
  const canvas = await rasterise(page, scale, keepsTransparency(settings));
  return canvas.toDataURL("image/png");
}

export interface RenderedExport {
  blob: Blob;
  filename: string;
  width: number;
  height: number;
}

/** Renders the page into a downloadable file using the panel's settings. */
export async function renderExport(
  page: Pick<CanvasPage, "width" | "height">,
  title: string,
  settings: ExportSettings,
  onProgress?: ProgressCallback,
): Promise<RenderedExport> {
  const { format, scale, quality } = settings;
  const definition = getExportFormat(format);
  const filename = exportFilename(title, definition.extension);

  const report = async (value: number, label: string) => {
    onProgress?.({ value, label });
    if (onProgress) await yieldToPaint();
  };

  await report(0.1, "Menyiapkan kanvas…");
  const canvas = await rasterise(page, scale, keepsTransparency(settings));

  await report(0.6, `Menyusun ${definition.label}…`);

  if (format === "pdf") {
    const jpeg = await toBlob(canvas, "image/jpeg", quality);
    await report(0.85, "Membungkus halaman PDF…");
    const pdf = jpegToPdf(
      new Uint8Array(await jpeg.arrayBuffer()),
      canvas.width,
      canvas.height,
      dpiFor(scale),
    );
    await report(1, "Selesai");
    return {
      // `slice()` hands Blob a plain ArrayBuffer, which is what its type asks
      // for — a Uint8Array may be backed by a SharedArrayBuffer.
      blob: new Blob([pdf.slice().buffer], { type: definition.mimeType }),
      filename,
      width: canvas.width,
      height: canvas.height,
    };
  }

  const blob = await toBlob(canvas, definition.mimeType, quality);
  await report(1, "Selesai");

  return { blob, filename, width: canvas.width, height: canvas.height };
}

/** Saves an already-encoded data URL, e.g. a generated QR Code. */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
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
