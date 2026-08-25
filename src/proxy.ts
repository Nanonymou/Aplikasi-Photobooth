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
 * and role checks stay where the data is (RoleGuard on the client today, a
 * server check when roles land in the schema).
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
  "/editor",
  "/kiosk",
  "/slideshow",
];

/**
 * Where a signed-out visitor is sent, with the route they wanted attached so
 * signing in returns them there rather than dumping them on a dashboard.
 */
const SIGN_IN = "/masuk";

function isProtected(pathname: string): boolean {
  return PROTECTED.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  if (!isProtected(pathname)) return NextResponse.next();

  // Presence is the whole check here; the value is verified where it is used.
  if (request.cookies.has(ACCOUNT_COOKIE)) return NextResponse.next();

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
