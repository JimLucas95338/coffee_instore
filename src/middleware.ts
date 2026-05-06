import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const MANAGER_ROUTES = ['/instore/pos'];
const MANAGER_API_PREFIXES = [
  '/api/instore/analytics',
];

function isManagerRoute(pathname: string): boolean {
  return MANAGER_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
}

function isManagerApi(pathname: string): boolean {
  return MANAGER_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isManagerRoute(pathname) && !isManagerApi(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request });
  if (!token) {
    if (isManagerApi(pathname)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  if (token.role !== 'ADMIN' && token.role !== 'MANAGER') {
    if (isManagerApi(pathname)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
};
