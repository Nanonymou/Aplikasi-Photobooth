/**
 * The reader's last position in the material, persisted per device.
 *
 * Just the id of the chapter last in view — chapter granularity matches the
 * chapter-based reader, and it's enough to drop someone back where they left off
 * on their next visit. Read once on mount and written as the active chapter
 * changes, so this stays a plain get/set rather than a reactive store. Both calls
 * swallow storage errors: a blocked or full localStorage should never break the
 * page. The backend phase moves this onto the peserta record.
 */

const STORAGE_KEY = "training-jsa-hiradc:materi-last-read:v1";

/** The chapter id last read, or null if none is stored / storage is blocked. */
export function readLastReadChapter(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeLastReadChapter(id: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // A full or blocked storage is not worth interrupting the reader for.
  }
}
