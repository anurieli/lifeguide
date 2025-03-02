import { createClient } from '@/utils/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

// Helper to log middleware activities
function logMiddleware(message: string) {
  const timestamp = new Date().toISOString();
  console.log(`[Middleware ${timestamp}] ${message}`);
  
  // Also store in localStorage for the debug panel
  if (typeof window !== 'undefined') {
    try {
      const existingLogs = JSON.parse(localStorage.getItem('middleware_logs') || '[]');
      existingLogs.push(`${timestamp} - ${message}`);
      localStorage.setItem('middleware_logs', JSON.stringify(existingLogs.slice(-100)));
    } catch (e) {
      // Ignore errors in middleware logs
    }
  }
}

// Helper to log cookie state
function logCookieState(request: NextRequest, prefix: string) {
  const timestamp = new Date().toISOString();
  const cookies = request.cookies.getAll();
  const authCookies = cookies.filter(c => 
    c.name.startsWith('sb-') || 
    c.name.includes('auth') || 
    c.name.includes('supabase')
  );
  
  console.log(`[Middleware ${timestamp}] ${prefix} Auth cookies (${authCookies.length}):`, 
    authCookies.map(c => ({
      name: c.name,
      value: c.name.includes('token') ? `${c.value.substring(0, 10)}...` : 'present',
      present: Boolean(c.value)
    }))
  );
}

export async function middleware(request: NextRequest) {
  const timestamp = new Date().toISOString();
  // List of public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/auth', '/about', '/guide', '/coming-soon']
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname === route || 
    request.nextUrl.pathname.startsWith('/auth/') ||
    request.nextUrl.pathname.startsWith('/guide/')
  )

  logMiddleware(`Processing request: ${request.nextUrl.pathname} (isPublic: ${isPublicRoute})`);
  logCookieState(request, 'Initial');

  // Create Supabase client for middleware
  console.log(`[Middleware ${timestamp}] Creating Supabase client for middleware`);
  const { supabase, response } = createClient(request);

  try {
    console.log(`[Middleware ${timestamp}] Getting user from Supabase`);
    // IMPORTANT! THIS MUST BE THE FIRST CALL AFTER CLIENT CREATION
    // DO NOT MOVE OR CHANGE THIS
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();
    
    if (userError) {
      console.error(`[Middleware ${timestamp}] Error getting user:`, userError);
      console.error(`[Middleware ${timestamp}] Error details:`, {
        message: userError.message,
        status: userError.status
      });
    }
    
    logMiddleware(`Auth state: ${user ? 'Authenticated' : 'Unauthenticated'}`);
    
    if (user) {
      console.log(`[Middleware ${timestamp}] User details:`, {
        id: user.id,
        email: user.email,
        emailConfirmed: user.email_confirmed_at ? 'yes' : 'no',
        lastSignIn: user.last_sign_in_at
      });
      
      // Get and log session as well
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error(`[Middleware ${timestamp}] Error getting session:`, sessionError);
      }
      
      if (session) {
        console.log(`[Middleware ${timestamp}] Session details:`, {
          expiry: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'unknown',
          provider: session.user?.app_metadata?.provider || 'unknown',
          refreshToken: session.refresh_token ? 'present' : 'missing'
        });
      } else {
        console.log(`[Middleware ${timestamp}] Session not present despite having a user`);
      }
    }

    // Cache control
    response.headers.set('Cache-Control', 'no-store, max-age=0');

    // For public routes, just return the response with the refreshed session
    if (isPublicRoute) {
      logMiddleware('Allowing access to public route');
      logCookieState(request, 'Public route');
      return response;
    }

    // For protected routes, check auth
    if (!user) {
      logMiddleware('No user found, redirecting to login');
      logCookieState(request, 'Redirecting to login');
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
    logCookieState(request, 'After processing');
    return response;
  } catch (error) {
    console.error(`[Middleware ${timestamp}] Middleware error:`, error);
    if (error instanceof Error) {
      console.error(`[Middleware ${timestamp}] Error details:`, {
        message: error.message,
        stack: error.stack
      });
    }
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
    
    console.log(`[Middleware ${timestamp}] Clearing cookies:`, cookiesToClear);
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