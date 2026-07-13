import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Route protection. The auth store mirrors the login session into cookies
 * (voqly_session, voqly_role) so this middleware can guard pages before they
 * render. The backend still validates the real JWT on every API call —
 * these cookies only gate page navigation.
 *
 * Rules:
 *  - /dashboard/**, /onboarding/**  → require a logged-in session
 *  - /superadmin/**                 → require a logged-in ADMIN session
 *  - anyone not logged in           → redirected to /login
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.get("voqly_session")?.value === "1";
  const role = req.cookies.get("voqly_role")?.value;

  // Not logged in → no access to any protected area
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("reason", "unauthorized");
    return NextResponse.redirect(url);
  }

  // Logged in, but only admins may enter the superadmin console
  if (pathname.startsWith("/superadmin") && role !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Admins don't use the vendor dashboard/onboarding — send them to their console
  if (!pathname.startsWith("/superadmin") && role === "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/superadmin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/superadmin/:path*", "/onboarding/:path*"],
};
