import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET || "protocollo-gare-dev-secret-change-me",
);

const publicPaths = ["/login", "/api/auth/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }
  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const token = req.cookies.get("pgare_session")?.value;
  let ok = false;
  if (token) {
    try {
      await jwtVerify(token, secret);
      ok = true;
    } catch {
      ok = false;
    }
  }
  if (!ok && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (ok && pathname === "/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
