import { NextResponse, type NextRequest } from "next/server";

import { ACCOUNT_COOKIE } from "@/lib/api/account";

/**
 * Route protection, before a page is ever rendered.
 *
 * In Next.js 16 this file is `proxy.ts`, not `middleware.ts` — the convention was
 * renamed, along with the exported function. It also runs on the Node.js runtime
 * now, which is not configurable.
 *
 * What it enforces is *authentication*, not authorisation: is there a session at
 * all? That is the question a cookie can answer on its own. Whether a signed-in
 * account may reach the admin console depends on its role, which lives in the
 * database — and a database round trip on every navigation would make each page
 * wait on Postgres to decide something the page itself is about to load anyway.
 * So the split is deliberate: this turns anonymous visitors away at the door,
 * and the role check happens in the page itself, in `lib/auth/page-guard.ts`,
 * which is already talking to the database.
 *
 * It also forwards the path it saw as a header, because a Server Component can
 * read headers but not the URL it is rendering for — and a guard that sends
 * someone to sign in has to know where to send them back to.
 *
 * The gate is also intentionally not the only one. A cookie's presence proves a
 * browser has *a* session, not a valid one; endpoints still verify identity for
 * themselves. This exists so a signed-out visitor is sent to sign in instead of
 * watching a private page flash and then empty itself.
 */

/** Routes that need an account. Prefix match: `/admin` covers `/admin/konten`. */
const PROTECTED = [
  "/admin",
  "/galeri",
  "/langganan",
  "/pengaturan",
  "/editor",
  "/kiosk",
  "/slideshow",
];

/**
 * Where a signed-out visitor is sent, with the route they wanted attached so
 * signing in returns them there rather than dumping them on a dashboard.
 */
const SIGN_IN = "/masuk";

/**
 * Where the page guards read the current path from.
 *
 * Set here rather than derived there: a Server Component sees headers, not the
 * URL, and reading a client-supplied header would let a visitor choose their own
 * post-sign-in destination.
 */
const PATH_HEADER = "x-pathname";

function isProtected(pathname: string): boolean {
  return PROTECTED.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/** The request, with the path it was made for attached for the page guards. */
function forward(request: NextRequest): NextResponse {
  const headers = new Headers(request.headers);
  headers.set(PATH_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.next({ request: { headers } });
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  if (!isProtected(pathname)) return forward(request);

  // Presence is the whole check here; the value is verified where it is used.
  if (request.cookies.has(ACCOUNT_COOKIE)) return forward(request);

  const signIn = new URL(SIGN_IN, request.url);
  // Carried as a path, never a full URL: echoing back an absolute address would
  // turn the sign-in page into an open redirect for anyone who can craft a link.
  signIn.searchParams.set("next", `${pathname}${search}`);

  return NextResponse.redirect(signIn);
}

export const config = {
  /*
   * Everything except:
   * - api            — endpoints answer for themselves, and a redirect would
   *                    hand a fetch() an HTML page instead of the JSON it awaits
   * - _next/static,
   *   _next/image    — build output and optimised images
   * - files with an
   *   extension      — anything served straight out of `public/`
   *
   * Without a matcher the proxy would run on every request including these, and
   * an auth redirect would keep the page's own CSS and JS from loading.
   */
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
