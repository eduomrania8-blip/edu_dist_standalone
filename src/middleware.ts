import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('session');
  const isLoginPage = request.nextUrl.pathname === '/login';

  if (!sessionCookie && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (sessionCookie && isLoginPage) {
    try {
      const session = JSON.parse(sessionCookie.value);
      if (session.role === 'guidance') {
        return NextResponse.redirect(new URL('/guidance', request.url));
      } else {
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch {
      // Invalid cookie, let them stay on login page to get a new one
    }
  }

  // Guidance role protection (prevent access to admin pages)
  if (sessionCookie && !isLoginPage) {
    try {
      const session = JSON.parse(sessionCookie.value);
      if (session.role === 'guidance') {
        const allowedPaths = ['/guidance', '/login'];
        if (!allowedPaths.some(p => request.nextUrl.pathname.startsWith(p))) {
          return NextResponse.redirect(new URL('/guidance', request.url));
        }
      }
    } catch {
      // ignore parsing error
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
