import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { AUTH_SECRET } from "@/lib/auth";

/**
 * Login gate: every page needs a signed-in session, except /login.
 * Signed-in users visiting /login are sent to the dashboard.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = await getToken({ req: request, secret: AUTH_SECRET });

  // Session exists but the backend token inside it has expired → treat as logged out
  const isExpired = !!token?.accessTokenExpires && Date.now() >= token.accessTokenExpires;
  // "Remember me" was off and the browser has since been closed (session cookie gone)
  const browserRestarted =
    request.cookies.get("bonchi_remember")?.value === "0" && !request.cookies.has("bonchi_alive");
  const isLoggedIn = !!token?.accessToken && !isExpired && !browserRestarted;
  const isLoginPage = pathname === "/login";

  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname + search);
    if (isExpired) loginUrl.searchParams.set("expired", "1");
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Everything except NextAuth endpoints, Next internals and static files
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)"],
};
