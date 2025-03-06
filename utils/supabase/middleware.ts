import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const updateSession = async (request: NextRequest) => {
  try {
    console.log(`[Middleware] Processing request for: ${request.nextUrl.pathname}`);
    
    // Log all cookies for debugging
    const allCookies = request.cookies.getAll();
    console.log(`[Middleware] Request cookies:`, allCookies.map(c => c.name));
    
    // Check for special modes and parameters
    const isRefresh = request.nextUrl.searchParams.has('refresh');
    const isAuthTransition = request.nextUrl.searchParams.has('auth_transition');
    
    // Check for password recovery mode
    const isPasswordRecoveryParam = request.nextUrl.searchParams.has('type') && 
                              request.nextUrl.searchParams.get('type') === 'recovery';
    
    // Check for recovery code_verifier cookie
    const hasRecoveryCodeVerifier = allCookies.some(cookie => 
      cookie.name.includes('auth-token-code-verifier') && 
      cookie.value.includes('PASSWORD_RECOVERY')
    );
    
    const isPasswordRecovery = isPasswordRecoveryParam || hasRecoveryCodeVerifier;
    
    // For password recovery flow, ONLY allow access to reset-password page
    // This prevents the weird state where users appear signed in but aren't fully
    if (isPasswordRecovery) {
      console.log('[Middleware] Password recovery session detected');
      
      // Only allow access to reset-password page and callback routes
      const allowedPaths = ['/auth/reset-password', '/auth/callback'];
      const isAllowedPath = allowedPaths.some(path => request.nextUrl.pathname.startsWith(path));
      
      if (!isAllowedPath) {
        console.log('[Middleware] Recovery session accessing restricted page, redirecting to reset password');
        const url = request.nextUrl.clone();
        url.pathname = '/auth/reset-password';
        return NextResponse.redirect(url);
      }
      
      // Otherwise, allow them to proceed to the reset password page
      console.log('[Middleware] Password recovery session accessing allowed page');
      
      // Create response with unmodified request
      let response = NextResponse.next({
        request,
      });
      
      return response;
    }
    
    if (isRefresh) {
      console.log('[Middleware] Refresh parameter detected, likely after sign-out');
      
      // Create a response to redirect to a clean URL
      const cleanUrl = request.nextUrl.clone();
      cleanUrl.searchParams.delete('refresh');
      cleanUrl.searchParams.delete('timestamp'); // Also remove timestamp parameter
      
      // Keep any error parameters
      if (request.nextUrl.searchParams.has('error')) {
        cleanUrl.searchParams.set('error', request.nextUrl.searchParams.get('error')!);
      }
      
      const response = NextResponse.redirect(cleanUrl);
      
      // Extract the project ID from the NEXT_PUBLIC_SUPABASE_URL
      const projectId = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^\.]+)\./)?.[1] || '';
      console.log(`[Middleware] Project ID for cookie clearing: ${projectId}`);
      
      // Clear all auth-related cookies with the correct project-specific names
      const cookiesToClear = [
        `sb-${projectId}-auth-token.0`,
        `sb-${projectId}-auth-token.1`,
        // Legacy cookie names as fallback
        'sb-access-token', 
        'sb-refresh-token',
        'supabase-auth-token'
      ];
      
      console.log(`[Middleware] Cookies to clear: ${cookiesToClear.join(', ')}`);
      
      // Log all cookies for debugging
      const allCookies = request.cookies.getAll();
      console.log(`[Middleware] All cookies before clearing:`, allCookies.map(c => c.name));
      
      // For OAuth sign-out, we need to be more aggressive with cookie clearing
      // First, clear all cookies in the response
      cookiesToClear.forEach(cookieName => {
        // Always attempt to clear the cookie, even if it's not present in the request
        // This ensures we catch any cookies that might be set elsewhere
        console.log(`[Middleware] Clearing cookie in response: ${cookieName}`);
        
        // Set cookie expiry to the past to ensure it's deleted
        response.cookies.set({
          name: cookieName,
          value: '',
          path: '/',
          expires: new Date(0), // Set to epoch time
          maxAge: 0,
          secure: true,
          httpOnly: true,
          sameSite: 'lax'
        });
        
        // Also explicitly delete the cookie
        response.cookies.delete({
          name: cookieName,
          path: '/',
        });
      });
      
      // Also clear cookies in the request object for the current request
      cookiesToClear.forEach(cookieName => {
        if (request.cookies.has(cookieName)) {
          request.cookies.delete(cookieName);
        }
      });
      
      console.log('[Middleware] All auth cookies cleared, redirecting to:', cleanUrl.pathname);
      return response;
    }
    
    if (isAuthTransition) {
      console.log('[Middleware] Auth transition parameter detected, allowing access temporarily');
      // If we're in an auth transition, allow access to protected routes temporarily
      // This gives the client time to establish the session
      const url = request.nextUrl.clone();
      url.searchParams.delete('auth_transition');
      
      // Create a response that will pass through the request
      return NextResponse.redirect(url);
    }
    
    // Create a response that will be modified with the session
    let supabaseResponse = NextResponse.next({
      request,
    });

    // Create a Supabase client with the request cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              console.log(`[Middleware] Setting cookie: ${name}`);
              request.cookies.set(name, value);
            });
            
            supabaseResponse = NextResponse.next({
              request,
            });
            
            cookiesToSet.forEach(({ name, value, options }) => {
              console.log(`[Middleware] Setting cookie in response: ${name}`);
              supabaseResponse.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // This will refresh session if expired - required for Server Components
    const {
      data: { user },
      error: getUserError
    } = await supabase.auth.getUser();

    if (getUserError) {
      console.error('[Middleware] Error getting user:', getUserError);
    }
    
    // Get the current URL path
    const path = request.nextUrl.pathname;
    
    console.log(`[Middleware] User authenticated: ${!!user}`);

    // Extract the project ID from the NEXT_PUBLIC_SUPABASE_URL
    const projectId = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^\.]+)\./)?.[1] || '';
    console.log(`[Middleware] Project ID for cookie check: ${projectId}`);
    
    // Check for access token in cookies as a fallback
    // We need to check for the project-specific cookie names
    const hasAuthCookie = request.cookies.has(`sb-${projectId}-auth-token.0`) || 
                          request.cookies.has(`sb-${projectId}-auth-token.1`);
    
    console.log(`[Middleware] Auth cookies present: ${hasAuthCookie}`);
    
    // Try to get the session directly as another fallback
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log(`[Middleware] Session check:`, session ? 'Session found' : 'No session', 
                'Error:', sessionError ? sessionError.message : 'None');
    
    // Consider the user authenticated if any of these conditions are true
    const isAuthenticated = !!user || hasAuthCookie || !!session;
    console.log(`[Middleware] Final authentication status: ${isAuthenticated}`);

    // Handle authentication for dashboard routes
    if (path.startsWith('/dashboard') && !isAuthenticated) {
      console.log('[Middleware] Unauthenticated user attempting to access dashboard, redirecting to login');
      // Redirect unauthenticated users to login page
      const url = request.nextUrl.clone();
      url.pathname = '/auth/login';
      url.searchParams.set('returnTo', path);
      return NextResponse.redirect(url);
    }

    // Handle authentication and authorization for admin routes
    if (path.startsWith('/admin')) {
      // First check if user is authenticated
      if (!isAuthenticated) {
        console.log('[Middleware] Unauthenticated user attempting to access admin, redirecting to login');
        const url = request.nextUrl.clone();
        url.pathname = '/auth/login';
        url.searchParams.set('returnTo', path);
        return NextResponse.redirect(url);
      }

      // For OAuth users, we might have auth cookies but no user object yet
      // In this case, we should allow access temporarily and let the client-side
      // handle the admin check once it gets the user object
      if (!user && hasAuthCookie) {
        console.log('[Middleware] Auth cookies present but no user object yet (likely OAuth). Allowing temporary access to admin page.');
        // We'll let the client-side handle the admin check
        return supabaseResponse;
      }

      // Then check if user is an admin by querying the admin_users table
      if (user) {
        console.log(`[Middleware] Checking if user ${user.email} is an admin`);
        const { data: adminData, error: adminError } = await supabase
          .from('admin_users')
          .select('id')
          .eq('email', user.email)
          .single();

        if (adminError) {
          console.error('[Middleware] Error checking admin status:', adminError);
        }

        // If not an admin, redirect to dashboard
        if (!adminData) {
          console.log('[Middleware] User is not an admin, redirecting to dashboard');
          const url = request.nextUrl.clone();
          url.pathname = '/dashboard';
          return NextResponse.redirect(url);
        }
        
        console.log('[Middleware] User is an admin, allowing access to admin page');
      }
    }

    // Redirect authenticated users from home page to dashboard
    if (request.nextUrl.pathname === "/" && user) {
      console.log('[Middleware] Authenticated user at home page, redirecting to dashboard');
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // IMPORTANT: You must return the supabaseResponse object as it is
    console.log('[Middleware] Request processed successfully');
    
    return supabaseResponse;
    
  } catch (e) {
    console.error("[Middleware] Supabase client error:", e);
    // If Supabase client could not be created, return a basic response
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};
