import { NextResponse, type NextRequest } from "next/server";

const appPaths = ["/dashboard", "/kyc", "/merchant", "/atlas", "/me", "/profile", "/demo"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAuthHint = request.cookies.get("bharosa-auth")?.value === "1";
  if (appPaths.some((path) => pathname.startsWith(path)) && !hasAuthHint) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/kyc/:path*", "/merchant/:path*", "/atlas/:path*", "/me/:path*", "/profile/:path*", "/demo/:path*"]
};
