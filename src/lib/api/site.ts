import "server-only";

/**
 * Where this app is reachable from outside.
 *
 * Needed wherever an address leaves the process — a sign-in link in an email, a
 * payment gateway's return URL, the URL inside a share QR — and the request
 * cannot answer it: `request.url` is rebuilt from the address the server itself
 * listens on, so behind a proxy (or plain `next start`) it reads `localhost`,
 * and a QR pointing at localhost is unscannable by definition.
 */

/**
 * The configured public origin, with no trailing slash.
 *
 * Taken from configuration rather than from the request's own Host header: a
 * header is attacker-controlled, and a sign-in link built from one is a
 * password-reset poisoning waiting to happen.
 *
 * `SITE_URL` is asked first and `NEXT_PUBLIC_SITE_URL` second, because the
 * public one is inlined into the bundle by `next build` and frozen there —
 * promote one build from staging to production and every link it mails out
 * still points at staging. The server-side name is read when the request is
 * served, so the same image can be deployed anywhere.
 */
function configured(): string | null {
  const value =
    process.env.SITE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return value ? value.replace(/\/+$/, "") : null;
}

export function siteUrl(): string {
  return configured() ?? "http://localhost:3000";
}

/** hostname, or hostname:port — anything else cannot be a host. */
const HOST = /^[a-z0-9.-]+(:\d{1,5})?$/i;

/**
 * A proxy adds its hop to these headers, so several proxies leave a list. The
 * first entry is the one nearest the client, which is the address they typed.
 */
function firstHop(value: string | null): string | null {
  const head = value?.split(",")[0]?.trim();
  return head ? head : null;
}

/**
 * The origin the caller reached this app on.
 *
 * For links that go back to the person who asked for them — a share QR is the
 * whole example — and *not* for links sent to somebody else. That is the line
 * between this and `siteUrl()`: forging the Host header here only misleads the
 * forger about their own link, while forging it on a sign-in mail would send
 * somebody else's token to the forger's domain.
 *
 * The configured address still wins when there is one, so a real deployment
 * never depends on a header at all.
 */
export function requestOrigin(request: Request): string {
  const set = configured();
  if (set) return set;

  const headers = request.headers;
  const host = firstHop(headers.get("x-forwarded-host")) ?? headers.get("host");
  if (!host || !HOST.test(host)) return new URL(request.url).origin;

  const forwardedProto = firstHop(headers.get("x-forwarded-proto"));
  const proto =
    forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : new URL(request.url).protocol.replace(":", "");

  return `${proto}://${host}`;
}
