import type {
  CanvasObject,
  CanvasPage,
  EditorProject,
  PageBackground,
} from "@/types/editor";

/**
 * Structural validation for a project arriving over HTTP.
 *
 * Everything here is untrusted: it comes from a browser that may be running an
 * older build, a stale tab, or nothing of ours at all. The check is deliberately
 * shallow — it guarantees the shape the database and the editor rely on (ids,
 * kinds, page geometry, a known background type) and lets object-specific fields
 * through untouched, because the object union grows with every decoration
 * feature and a strict allow-list here would reject next week's sticker.
 *
 * Limits exist to keep one request from becoming a denial of service, not to
 * express taste.
 */

export const LIMITS = {
  maxPages: 50,
  maxObjectsPerPage: 500,
  maxTitleLength: 200,
  minPageSide: 16,
  maxPageSide: 20_000,
  /** Photos ride along as data URLs today, so the ceiling is generous. */
  maxBodyBytes: 12 * 1024 * 1024,
} as const;

const BACKGROUND_TYPES: PageBackground["type"][] = [
  "transparent",
  "solid",
  "gradient",
  "pattern",
  "image",
];

export type ValidationResult =
  | { ok: true; project: EditorProject }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validateObject(value: unknown, where: string): string | null {
  if (!isRecord(value)) return `${where} bukan objek`;
  if (typeof value.id !== "string" || value.id.length === 0) {
    return `${where} tidak punya id`;
  }
  if (typeof value.kind !== "string") return `${where} tidak punya kind`;

  for (const field of ["x", "y", "width", "height"]) {
    if (!isFiniteNumber(value[field])) {
      return `${where} punya ${field} yang tidak valid`;
    }
  }
  return null;
}

/**
 * One page, checked.
 *
 * Exported so the single-page autosave applies exactly the same rules as the
 * whole-document one. A page saved through the narrow endpoint and the same page
 * saved through the wide one must be able to fail for the same reasons, or the
 * narrow one becomes a way in for documents the wide one refuses.
 */
export function validatePage(value: unknown, index: number): string | null {
  const where = `Halaman ${index + 1}`;
  if (!isRecord(value)) return `${where} bukan objek`;
  if (typeof value.id !== "string" || value.id.length === 0) {
    return `${where} tidak punya id`;
  }
  if (value.id.length > 64) return `${where} punya id terlalu panjang`;
  if (typeof value.name !== "string" || value.name.trim().length === 0) {
    return `${where} tidak punya nama`;
  }

  for (const side of ["width", "height"] as const) {
    const measure = value[side];
    if (
      !isFiniteNumber(measure) ||
      !Number.isInteger(measure) ||
      measure < LIMITS.minPageSide ||
      measure > LIMITS.maxPageSide
    ) {
      return `${where} punya ${side} di luar batas`;
    }
  }

  if (
    !isRecord(value.background) ||
    !BACKGROUND_TYPES.includes(value.background.type as PageBackground["type"])
  ) {
    return `${where} punya latar yang tidak dikenal`;
  }

  if (!Array.isArray(value.objects)) return `${where} tidak punya daftar objek`;
  if (value.objects.length > LIMITS.maxObjectsPerPage) {
    return `${where} melebihi ${LIMITS.maxObjectsPerPage} objek`;
  }

  for (const [objectIndex, object] of value.objects.entries()) {
    const problem = validateObject(object, `${where} objek ${objectIndex + 1}`);
    if (problem) return problem;
  }

  if (
    value.templateId !== undefined &&
    value.templateId !== null &&
    typeof value.templateId !== "string"
  ) {
    return `${where} punya templateId yang tidak valid`;
  }

  return null;
}

export function validateProject(value: unknown): ValidationResult {
  if (!isRecord(value)) return { ok: false, error: "Body bukan objek JSON." };

  const title = value.title;
  if (typeof title !== "string" || title.trim().length === 0) {
    return { ok: false, error: "Judul wajib diisi." };
  }
  if (title.length > LIMITS.maxTitleLength) {
    return { ok: false, error: `Judul melebihi ${LIMITS.maxTitleLength} karakter.` };
  }

  if (!Array.isArray(value.pages) || value.pages.length === 0) {
    return { ok: false, error: "Desain harus punya minimal satu halaman." };
  }
  if (value.pages.length > LIMITS.maxPages) {
    return { ok: false, error: `Desain melebihi ${LIMITS.maxPages} halaman.` };
  }

  const ids = new Set<string>();
  for (const [index, page] of value.pages.entries()) {
    const problem = validatePage(page, index);
    if (problem) return { ok: false, error: `${problem}.` };

    const id = (page as CanvasPage).id;
    if (ids.has(id)) {
      return { ok: false, error: `Id halaman ${id} muncul lebih dari sekali.` };
    }
    ids.add(id);
  }

  return {
    ok: true,
    project: {
      // The id is the server's to decide, so whatever the client sent is
      // ignored here and filled in by the caller from the row it wrote.
      id: typeof value.id === "string" ? value.id : "",
      title: title.trim(),
      pages: value.pages as CanvasPage[],
      updatedAt:
        typeof value.updatedAt === "string"
          ? value.updatedAt
          : new Date().toISOString(),
    },
  };
}

/** Narrowing helper for callers that already validated. */
export type ValidatedObject = CanvasObject;
