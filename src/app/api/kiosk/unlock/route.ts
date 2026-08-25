import { withPermission } from "@/lib/api/authorize";
import { jsonError, readJsonBody } from "@/lib/api/http";
import { checkKioskPin, PIN_PATTERN } from "@/lib/db/kiosk-settings";

// `pg` opens TCP sockets, which the edge runtime cannot do.
export const runtime = "nodejs";

/**
 * How many wrong PINs before the pad closes, and for how long.
 *
 * Four digits is ten thousand guesses; at a few tries a second a browser would
 * walk the whole space over a lunch break. The lockout is what makes the PIN
 * mean anything — the hash protects it if the table leaks, this protects it
 * against the person standing in front of the booth.
 */
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

interface Attempts {
  count: number;
  until: number;
}

/**
 * Failed attempts, per account, in memory.
 *
 * Deliberately not a table: this is throttling state, it is worthless a quarter
 * of an hour later, and writing a row for every mistyped digit would put the
 * booth's busiest failure path through the database. A restart forgives an
 * attacker their tally, which is the honest trade — the alternative costs a
 * write per keystroke to defend a device someone is physically standing at.
 */
const failures = new Map<string, Attempts>();

function locked(accountId: string): number {
  const record = failures.get(accountId);
  if (!record || record.count < MAX_ATTEMPTS) return 0;

  const remaining = record.until - Date.now();
  if (remaining > 0) return remaining;

  failures.delete(accountId);
  return 0;
}

function recordFailure(accountId: string): number {
  const record = failures.get(accountId) ?? { count: 0, until: 0 };
  record.count += 1;
  record.until = Date.now() + LOCKOUT_MS;
  failures.set(accountId, record);

  return Math.max(0, MAX_ATTEMPTS - record.count);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Checks the organizer's exit PIN.
 *
 * The comparison happens here rather than in the browser because kiosk mode's
 * whole purpose is to keep a guest inside it: a PIN the client can compare is a
 * PIN the client was given, and a guest with the booth's own devtools is not a
 * hypothetical when the device is unattended by definition.
 *
 * Answers only "yes" or "no" — never how close the guess was, never whether a
 * PIN is set (that is `GET /api/kiosk/config`, which requires the same
 * permission). A wrong PIN and an unconfigured booth look identical here.
 */
export const POST = withPermission(
  "booth.kiosk",
  async (viewer, request: Request) => {
    const wait = locked(viewer.profile.id);
    if (wait > 0) {
      return jsonError(
        429,
        "Terlalu banyak percobaan. Coba lagi nanti.",
        { retryAfterSeconds: Math.ceil(wait / 1000) },
      );
    }

    const body = await readJsonBody(request);
    if (!body.ok) return body.response;
    if (!isRecord(body.value)) return jsonError(400, "Body bukan objek.");

    const pin = body.value.pin;
    if (typeof pin !== "string" || !PIN_PATTERN.test(pin)) {
      return jsonError(400, "PIN harus 4 digit angka.");
    }

    try {
      if (await checkKioskPin(pin)) {
        failures.delete(viewer.profile.id);
        return Response.json(
          { unlocked: true },
          { headers: { "cache-control": "private, no-store" } },
        );
      }

      const remaining = recordFailure(viewer.profile.id);
      return jsonError(401, "PIN salah.", { attemptsRemaining: remaining });
    } catch (error) {
      console.error("POST /api/kiosk/unlock failed", error);
      return jsonError(500, "PIN gagal diperiksa.");
    }
  },
);
