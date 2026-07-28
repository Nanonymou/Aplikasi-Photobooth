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
