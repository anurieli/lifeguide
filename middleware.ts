import { createClient } from '@/utils/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

// Helper to log middleware activities
function logMiddleware(message: string) {
  console.log(`[Middleware] ${message}`);
  
  // Also store in localStorage for the debug panel
  if (typeof window !== 'undefined') {
    try {
      const existingLogs = JSON.parse(localStorage.getItem('middleware_logs') || '[]');
      existingLogs.push(`${new Date().toISOString()} - ${message}`);
      localStorage.setItem('middleware_logs', JSON.stringify(existingLogs.slice(-100)));
    } catch (e) {
      // Ignore errors in middleware logs
    }
  }
}

export async function middleware(request: NextRequest) {
  // List of public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/auth', '/about', '/guide', '/coming-soon']
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname === route || 
    request.nextUrl.pathname.startsWith('/auth/') ||
    request.nextUrl.pathname.startsWith('/guide/')
  )

  logMiddleware(`Processing request: ${request.nextUrl.pathname} (isPublic: ${isPublicRoute})`);

  // Create Supabase client for middleware
  const { supabase, response } = createClient(request);

  try {
    // IMPORTANT! THIS MUST BE THE FIRST CALL AFTER CLIENT CREATION
    // DO NOT MOVE OR CHANGE THIS
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    logMiddleware(`Auth state: ${user ? 'Authenticated' : 'Unauthenticated'}`);

    // Cache control
    response.headers.set('Cache-Control', 'no-store, max-age=0');

    // For public routes, just return the response with the refreshed session
    if (isPublicRoute) {
      logMiddleware('Allowing access to public route');
      return response;
    }

    // For protected routes, check auth
    if (!user) {
      logMiddleware('No user found, redirecting to login');
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('returnTo', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // For admin routes, check if user is admin
    if (request.nextUrl.pathname.startsWith('/admin')) {
      const isAdmin = user?.email === 'anurieli365@gmail.com' || user?.role === 'admin';
      
      if (!isAdmin) {
        logMiddleware('Non-admin user attempted to access admin route');
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      
      logMiddleware('Admin access granted');
    }

    // If user is trying to access login page but is already logged in
    if (request.nextUrl.pathname === '/login' && user) {
      logMiddleware('User already logged in, redirecting from login');
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    logMiddleware('Request processed successfully');
    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    logMiddleware(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // For public routes or errors in middleware, just proceed
    if (isPublicRoute) {
      return response;
    }
    
    // For protected routes, redirect to login
    const redirectResponse = NextResponse.redirect(new URL('/login', request.url));
    
    // Clear auth cookies
    const cookiesToClear = [
      'sb-access-token', 
      'sb-refresh-token',
      'sb-provider-token',
      'sb-auth-token',
      'sb-auth-token-csrf',
      'sb-auth-event'
    ];
    
    cookiesToClear.forEach(name => {
      redirectResponse.cookies.delete(name);
    });
    
    return redirectResponse;
  }
}

// Specify which routes should be protected by the middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 