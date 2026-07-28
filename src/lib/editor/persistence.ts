import type { EditorProject } from "@/types/editor";

/**
 * Versioned key: bumping it retires incompatible saves instead of trying to
 * migrate half-understood data from an older build.
 *
 * Exported so the autosave hook can tell this key apart from every other one in
 * a cross-tab `storage` event.
 */
export const PROJECT_STORAGE_KEY = "framestudio:project:v1";
const STORAGE_KEY = PROJECT_STORAGE_KEY;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Structural check on data coming back from localStorage.
 *
 * The store is only ever handed a project that passes this, so a corrupted or
 * stale entry degrades to "start fresh" rather than crashing the editor.
 */
function isEditorProject(value: unknown): value is EditorProject {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || typeof value.title !== "string") {
    return false;
  }
  if (!Array.isArray(value.pages) || value.pages.length === 0) return false;

  return value.pages.every((page) => {
    if (!isRecord(page)) return false;
    return (
      typeof page.id === "string" &&
      typeof page.width === "number" &&
      typeof page.height === "number" &&
      isRecord(page.background) &&
      Array.isArray(page.objects) &&
      page.objects.every(
        (object) =>
          isRecord(object) &&
          typeof object.id === "string" &&
          typeof object.kind === "string",
      )
    );
  });
}

export function loadStoredProject(): EditorProject | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    return isEditorProject(parsed) ? parsed : null;
  } catch {
    // Unreadable storage (private mode, corrupted JSON) is not worth failing over.
    return null;
  }
}

/** Writes the project. Throws on quota errors so callers can show the failure. */
export function storeProject(project: EditorProject): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
}

export function clearStoredProject(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing useful to do if storage is unavailable.
  }
}
