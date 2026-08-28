import { LIMITS } from "@/lib/api/validate-project";

/**
 * Shared response helpers.
 *
 * Every endpoint answers failures the same way — `{ error }` with a fitting
 * status — so the client has one thing to parse no matter what went wrong.
 */

export function jsonError(
  status: number,
  error: string,
  extra: Record<string, unknown> = {},
): Response {
  return Response.json({ error, ...extra }, { status });
}

export type BodyResult =
  | { ok: true; value: unknown }
  | { ok: false; response: Response };

/**
 * Whether a parsed body is a JSON object — an array is not one.
 *
 * `typeof [] === "object"`, so the obvious check lets arrays through and every
 * caller that then looks for unknown keys reports the indices: an array body
 * came back as "Bidang tidak dikenal: 0, 1". Shared so the answer is the same
 * everywhere rather than right in whichever route remembered.
 */
export function isJsonObject(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Reads a JSON body, refusing anything oversized before it is parsed.
 *
 * A photostrip carries its photos inline as data URLs, so bodies are megabytes
 * rather than kilobytes; the ceiling is what keeps that from becoming an easy
 * way to exhaust the server. `Content-Length` is checked first because it is
 * free, then the actual text, because the header can lie.
 */
export async function readJsonBody(request: Request): Promise<BodyResult> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > LIMITS.maxBodyBytes) {
    return {
      ok: false,
      response: jsonError(413, "Desain terlalu besar untuk disimpan."),
    };
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, response: jsonError(400, "Body tidak terbaca.") };
  }

  // An absent body is not malformed JSON, and saying so costs somebody ten
  // minutes looking for the syntax error in a request they never sent one in.
  if (text.trim().length === 0) {
    return { ok: false, response: jsonError(400, "Body wajib diisi.") };
  }

  if (text.length > LIMITS.maxBodyBytes) {
    return {
      ok: false,
      response: jsonError(413, "Desain terlalu besar untuk disimpan."),
    };
  }

  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, response: jsonError(400, "Body bukan JSON yang valid.") };
  }
}
