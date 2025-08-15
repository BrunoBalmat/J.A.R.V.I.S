import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
// Avoid importing Node-only modules in edge middleware. We'll only check cookie presence here.

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const isAuth = Boolean(token);

	const { pathname } = request.nextUrl;
	const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register");

			if (!isAuth && !isAuthRoute && pathname === "/controle") {
		const url = request.nextUrl.clone();
		url.pathname = "/login";
		return NextResponse.redirect(url);
	}

	if (isAuth && isAuthRoute) {
		const url = request.nextUrl.clone();
		url.pathname = "/";
		return NextResponse.redirect(url);
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/controle", "/login", "/register"],
};


