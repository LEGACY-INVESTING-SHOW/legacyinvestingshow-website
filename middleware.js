// middleware.js - Redirects Vercel subdomain to custom domain
export default function middleware(request) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host');
  
  // If accessing via Vercel subdomain, redirect to custom domain
  if (hostname && hostname.includes('vercel.app')) {
    url.hostname = 'www.legacyinvestingshow.com';
    return Response.redirect(url, 301);
  }
  
  return Response.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
