import { jsonError, readJsonBody } from "@/lib/api/http";
import { isValidKey } from "@/lib/storage/photo-storage";

/**
 * The body every image tool takes: which stored photo to work on, plus that
 * tool's own knobs.
 *
 * Shared so the four AI endpoints answer the same way when a caller gets the
 * common part wrong, and so each route file is only its own algorithm's
 * parameters.
 */
export type AiRequest =
  | { ok: true; key: string; body: Record<string, unknown> }
  | { ok: false; response: Response };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function readAiRequest(request: Request): Promise<AiRequest> {
  const body = await readJsonBody(request);
  if (!body.ok) return { ok: false, response: body.response };
  if (!isRecord(body.value)) {
    return { ok: false, response: jsonError(400, "Body bukan objek JSON.") };
  }

  const key = body.value.key;
  if (typeof key !== "string" || !isValidKey(key)) {
    return {
      ok: false,
      response: jsonError(400, "Bidang `key` harus kunci foto tersimpan."),
    };
  }

  return { ok: true, key, body: body.value };
}

/**
 * Reads an optional numeric knob, clamped rather than rejected.
 *
 * A slider that sends 200 when the maximum is 160 is asking for the strongest
 * setting, not making a mistake; failing the whole request over it would help
 * nobody.
 */
export function readNumber(
  body: Record<string, unknown>,
  field: string,
  { min, max, fallback }: { min: number; max: number; fallback: number },
): { ok: true; value: number } | { ok: false; response: Response } {
  const raw = body[field];
  if (raw === undefined || raw === null) return { ok: true, value: fallback };

  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return {
      ok: false,
      response: jsonError(400, `Bidang \`${field}\` harus angka.`),
    };
  }

  return { ok: true, value: Math.min(max, Math.max(min, raw)) };
}
