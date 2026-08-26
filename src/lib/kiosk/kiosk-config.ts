/**
 * The kiosk screen's side of the booth configuration.
 *
 * Deliberately narrower than the row behind it: the screen shows a name, a line
 * of welcome, and the product's name, and needs to know only *whether* an exit
 * PIN exists. The PIN itself is checked by `POST /api/kiosk/unlock` and never
 * travels — kiosk mode exists to keep a guest inside it, and a secret the
 * browser holds is a secret the guest holds, on a device that is unattended by
 * definition.
 */
export interface KioskScreenConfig {
  eventName: string;
  tagline: string;
  brandName: string;
  /** Whether an exit PIN has been set. Never the PIN. */
  pinSet: boolean;
}

/** How many digits the pad asks for. Matches the column's own constraint. */
export const PIN_LENGTH = 4;

export type UnlockResult =
  | { ok: true }
  | { ok: false; kind: "wrong"; attemptsRemaining: number | null }
  | { ok: false; kind: "locked"; retryAfterSeconds: number | null }
  | { ok: false; kind: "error"; message: string };

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Asks the server whether this PIN opens the exit.
 *
 * Every failure is spelled out as a `kind` rather than a message, because the
 * three of them want three different screens: a wrong PIN clears the pad, a
 * lockout closes it for a quarter of an hour, and a network error must not be
 * mistaken for either — telling an organizer "PIN salah" when the wifi dropped
 * sends them looking for the wrong problem.
 */
export async function submitExitPin(pin: string): Promise<UnlockResult> {
  let response: Response;
  try {
    response = await fetch("/api/kiosk/unlock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pin }),
    });
  } catch {
    return { ok: false, kind: "error", message: "Tidak bisa menghubungi server." };
  }

  if (response.ok) return { ok: true };

  const body: unknown = await response.json().catch(() => null);
  const details = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

  if (response.status === 429) {
    return {
      ok: false,
      kind: "locked",
      retryAfterSeconds: numberOrNull(details.retryAfterSeconds),
    };
  }

  if (response.status === 401) {
    return {
      ok: false,
      kind: "wrong",
      attemptsRemaining: numberOrNull(details.attemptsRemaining),
    };
  }

  return {
    ok: false,
    kind: "error",
    message:
      typeof details.error === "string"
        ? details.error
        : "PIN gagal diperiksa.",
  };
}
