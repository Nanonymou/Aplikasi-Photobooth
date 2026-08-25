/**
 * Editing your own profile.
 *
 * Stand-in for `PATCH /api/account/profile` — the two fields an account holder
 * owns about themselves. `saveProfile` imitates the write (a pause, no
 * persistence) so the form's dirty → saving → saved flow is real ahead of the
 * wiring; when it lands, only the body of this function changes.
 */

export interface ProfileDraft {
  name: string;
  /** A remote avatar, or null for the initials fallback. */
  avatarUrl: string | null;
}

/** Long enough for a real name, short enough not to be a sentence. */
export const NAME_MAX = 120;

/**
 * What the form will accept, said once.
 *
 * The rule and the message live together because they are the same statement:
 * a validator that returns a boolean leaves the copy to be written a second
 * time, next to it, where the two drift.
 */
export function nameProblem(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "Nama tampilan tidak boleh kosong.";
  if (trimmed.length > NAME_MAX) {
    return `Nama tampilan melebihi ${NAME_MAX} karakter.`;
  }
  return null;
}

const SAVE_LATENCY_MS = 700;

export async function saveProfile(draft: ProfileDraft): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, SAVE_LATENCY_MS));
  void draft;
}
