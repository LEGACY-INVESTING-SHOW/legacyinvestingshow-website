import { NextResponse } from 'next/server';

export function middleware(request) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host');
  
  // If accessing via Vercel subdomain, redirect to custom domain
  if (hostname && hostname.includes('vercel.app')) {
    url.hostname = 'www.legacyinvestingshow.com';
    return NextResponse.redirect(url, 301);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
