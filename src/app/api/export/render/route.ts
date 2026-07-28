import { jsonError, readJsonBody } from "@/lib/api/http";
import { requireOwnerId } from "@/lib/api/owner";
import { validateProject } from "@/lib/api/validate-project";
import {
  MAX_SCALE,
  MIN_SCALE,
  RenderTooLargeError,
  renderPage,
} from "@/lib/render/render-page";
import { getPhotoStorage } from "@/lib/storage/photo-storage";
import type { CanvasPage } from "@/types/editor";

export const runtime = "nodejs";

/** 4× the page's design pixels, i.e. 300 DPI — what a print shop asks for. */
const DEFAULT_SCALE = 4;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Generates a high-resolution file from a design.
 *
 *   { project, pageIndex?, scale? } → { key, url, width, height, bytes, dpi }
 *
 * The editor exports by cropping its own canvas, which is exact but needs a
 * browser with the design open. This is for everything else: a print job, a
 * shared gallery, a QR handed to a guest whose phone was never in the editor.
 * The page is rebuilt from the model and rasterised from vector, so 300 DPI is
 * genuinely 300 DPI rather than an enlargement of a screen-sized picture.
 *
 * The result lands in the same content-addressed storage as photos, so the URL
 * can be handed out directly.
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

  const rawScale = body.value.scale ?? DEFAULT_SCALE;
  if (typeof rawScale !== "number" || !Number.isFinite(rawScale)) {
    return jsonError(400, "Bidang `scale` harus angka.");
  }
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, rawScale));

  try {
    await requireOwnerId();

    const page = validated.project.pages[pageIndex] as CanvasPage;
    const rendered = await renderPage(page, scale);

    const storage = getPhotoStorage();
    const stored = await storage.put(new Uint8Array(rendered.data), "png");

    return Response.json(
      {
        key: stored.key,
        url: storage.url(stored.key),
        width: rendered.width,
        height: rendered.height,
        bytes: stored.bytes,
        scale,
        // Design pixels are treated as 72 DPI, so the scale IS the DPI ratio.
        dpi: Math.round(72 * scale),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof RenderTooLargeError) {
      return jsonError(413, error.message);
    }
    console.error("POST /api/export/render failed", error);
    return jsonError(500, "Render gagal.");
  }
}
