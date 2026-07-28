import { EXPORT_FORMATS, type ExportFormat } from "@/lib/editor/export";
import { jsonError, readJsonBody } from "@/lib/api/http";
import { requireOwnerId } from "@/lib/api/owner";
import { validateProject } from "@/lib/api/validate-project";
import { recordRender } from "@/lib/db/renders";
import { convertRender } from "@/lib/render/convert";
import { getRenderStorage } from "@/lib/storage/render-storage";
import {
  MAX_SCALE,
  MIN_SCALE,
  RenderTooLargeError,
  renderPage,
} from "@/lib/render/render-page";
import { exportFilename } from "@/lib/editor/export";
import type { CanvasPage } from "@/types/editor";

export const runtime = "nodejs";

/** 4× the page's design pixels, i.e. 300 DPI — what a print shop asks for. */
const DEFAULT_SCALE = 4;
const DEFAULT_QUALITY = 0.92;

const FORMAT_IDS = EXPORT_FORMATS.map((format) => format.id);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Generates a high-resolution file from a design.
 *
 *   { project, pageIndex?, scale?, format?, quality?, transparent?, persist? }
 *     → the file itself, with its size and DPI in `x-render-*` headers,
 *       or — with `persist` — JSON holding a URL that serves it for a while
 *
 * The editor exports by cropping its own canvas, which is exact but needs a
 * browser with the design open. This is for everything else: a print job, a
 * shared gallery, a QR handed to a guest whose phone was never in the editor.
 * The page is rebuilt from the model and rasterised from vector, so 300 DPI is
 * genuinely 300 DPI rather than an enlargement of a screen-sized picture.
 *
 * By default the file is streamed back: an export is usually something the
 * caller is about to save, not something the server needs to keep. `persist`
 * puts it in the temporary render store instead and answers with a URL — for a
 * print queue, a download that starts after the dialog closes, or a share link
 * built from a format photo storage will not hold, such as PDF.
 */
export async function POST(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  if (!isRecord(body.value)) return jsonError(400, "Body bukan objek JSON.");

  if (body.value.project === undefined) {
    return jsonError(400, "Bidang `project` wajib diisi.");
  }
  const validated = validateProject(body.value.project);
  if (!validated.ok) return jsonError(400, validated.error);

  const pageIndex = body.value.pageIndex ?? 0;
  if (
    typeof pageIndex !== "number" ||
    !Number.isInteger(pageIndex) ||
    pageIndex < 0 ||
    pageIndex >= validated.project.pages.length
  ) {
    return jsonError(400, "Bidang `pageIndex` di luar jangkauan desain.");
  }

  const format = (body.value.format ?? "png") as ExportFormat;
  if (!FORMAT_IDS.includes(format)) {
    return jsonError(400, `Format harus salah satu dari: ${FORMAT_IDS.join(", ")}.`);
  }

  const rawQuality = body.value.quality ?? DEFAULT_QUALITY;
  if (typeof rawQuality !== "number" || !Number.isFinite(rawQuality)) {
    return jsonError(400, "Bidang `quality` harus angka 0–1.");
  }
  const quality = Math.min(1, Math.max(0, rawQuality));

  const transparent = body.value.transparent ?? true;
  if (typeof transparent !== "boolean") {
    return jsonError(400, "Bidang `transparent` harus boolean.");
  }

  const persist = body.value.persist ?? false;
  if (typeof persist !== "boolean") {
    return jsonError(400, "Bidang `persist` harus boolean.");
  }

  const rawScale = body.value.scale ?? DEFAULT_SCALE;
  if (typeof rawScale !== "number" || !Number.isFinite(rawScale)) {
    return jsonError(400, "Bidang `scale` harus angka.");
  }
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, rawScale));

  try {
    await requireOwnerId();

    const page = validated.project.pages[pageIndex] as CanvasPage;
    const dpi = Math.round(72 * scale);

    const rendered = await renderPage(page, scale);
    const file = await convertRender(rendered.data, {
      format,
      quality,
      transparent,
      dpi,
    });

    const filename = exportFilename(validated.project.title, file.extension);

    if (persist) {
      const storage = getRenderStorage();
      const stored = await storage.put(new Uint8Array(file.data), file.extension);
      const record = await recordRender(await requireOwnerId(), {
        storageKey: stored.key,
        contentType: file.contentType,
        filename,
        bytes: stored.bytes,
        width: rendered.width,
        height: rendered.height,
      });

      return Response.json({ ...record, format, scale, dpi }, { status: 201 });
    }

    return new Response(file.data as BodyInit, {
      headers: {
        "content-type": file.contentType,
        "content-length": String(file.data.byteLength),
        "content-disposition": `attachment; filename="${filename}"`,
        // The pixel size and density are not in the bytes for every format, and
        // a caller showing "4800×7200 @300dpi" should not have to decode the
        // file to learn it.
        "x-render-width": String(rendered.width),
        "x-render-height": String(rendered.height),
        "x-render-dpi": String(dpi),
        "x-render-format": format,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof RenderTooLargeError) {
      return jsonError(413, error.message);
    }
    console.error("POST /api/export/render failed", error);
    return jsonError(500, "Render gagal.");
  }
}
