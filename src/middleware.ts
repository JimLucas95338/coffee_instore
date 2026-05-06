import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const MANAGER_ROUTES = ['/instore/pos'];
const MANAGER_API_PREFIXES = ['/api/instore/analytics'];
const ADMIN_ROUTES = ['/admin'];
const ADMIN_API_PREFIXES = ['/api/admin'];

function matches(pathname: string, list: string[]): boolean {
  return list.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const adminGated = matches(pathname, ADMIN_ROUTES) || matches(pathname, ADMIN_API_PREFIXES);
  const managerGated =
    matches(pathname, MANAGER_ROUTES) || matches(pathname, MANAGER_API_PREFIXES);

  if (!adminGated && !managerGated) {
    return NextResponse.next();
  }

  const isApi = pathname.startsWith('/api/');
  const token = await getToken({ req: request });

  if (!token) {
    if (isApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  if (adminGated && token.role !== 'ADMIN') {
    if (isApi) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/instore/kiosk', request.url));
  }

  if (managerGated && token.role !== 'ADMIN' && token.role !== 'MANAGER') {
    if (isApi) {
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
