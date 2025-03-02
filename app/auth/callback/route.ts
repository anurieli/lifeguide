import { createRouteHandlerClient } from '@/utils/supabase/route'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const timestamp = new Date().toISOString();
  console.log(`[AuthCallback ${timestamp}] Processing OAuth callback`);
  
  const requestUrl = new URL(request.url)
  console.log(`[AuthCallback ${timestamp}] Request URL: ${requestUrl.toString()}`);
  
  const code = requestUrl.searchParams.get('code')
  const returnTo = requestUrl.searchParams.get('returnTo') || '/dashboard'
  
  console.log(`[AuthCallback ${timestamp}] Auth code present: ${Boolean(code)}`);
  console.log(`[AuthCallback ${timestamp}] Auth code length: ${code?.length || 0}`);
  console.log(`[AuthCallback ${timestamp}] Return path: ${returnTo}`);

  try {
    // Check request headers for cookie information
    const cookieHeader = request.headers.get('cookie') || '';
    console.log(`[AuthCallback ${timestamp}] Request cookies:`, 
      cookieHeader.split('; ')
        .filter(c => c.startsWith('sb-') || c.includes('auth') || c.includes('mock_user'))
        .map(c => {
          const [name, value] = c.split('=');
          return { 
            name, 
            valuePreview: name.includes('token') ? `${value.substring(0, 8)}...` : 'present' 
          };
        })
    );

    if (code) {
      console.log(`[AuthCallback ${timestamp}] Exchanging code for session...`);
      
      const response = NextResponse.redirect(new URL(returnTo, requestUrl.origin))
      console.log(`[AuthCallback ${timestamp}] Creating route handler client...`);
      const supabase = await createRouteHandlerClient(response)

      console.log(`[AuthCallback ${timestamp}] Exchanging code for session...`);
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error(`[AuthCallback ${timestamp}] Error exchanging code:`, error);
        console.error(`[AuthCallback ${timestamp}] Error details:`, {
          message: error.message,
          status: error.status,
          stack: error.stack
        });
        
        // Log all request information for debugging
        console.error(`[AuthCallback ${timestamp}] Request information:`, {
          method: request.method,
          headers: Array.from(request.headers.entries()),
          url: request.url
        });
        
        // Still redirect to avoid leaving user on callback page
        return response;
      }
      
      if (data.session) {
        console.log(`[AuthCallback ${timestamp}] Session obtained successfully`);
        console.log(`[AuthCallback ${timestamp}] Session details:`, {
          user: data.session.user.id,
          email: data.session.user.email,
          expiry: data.session.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : 'unknown',
          provider: data.session.provider,
          tokenRefreshed: Boolean(data.session.refresh_token),
          accessTokenLength: data.session.access_token?.length || 0
        });
        
        // Check response cookies
        const setCookieHeader = response.headers.get('set-cookie') || '';
        const cookiesSet = setCookieHeader.split(', ')
          .filter(c => c.startsWith('sb-') || c.includes('auth'))
          .length;
        
        console.log(`[AuthCallback ${timestamp}] Cookies set on response: ${cookiesSet}`);
        
        // Ensure any mock_user cookie is cleared
        response.cookies.delete('mock_user');
        console.log(`[AuthCallback ${timestamp}] Cleared mock_user cookie if present`);
      } else {
        console.log(`[AuthCallback ${timestamp}] No session data returned despite no error`);
        console.log(`[AuthCallback ${timestamp}] Full response data:`, JSON.stringify(data));
      }
      
      console.log(`[AuthCallback ${timestamp}] Redirecting to: ${returnTo}`);
      return response
    }

    // If no code is present, redirect to home page
    console.log(`[AuthCallback ${timestamp}] No code present, redirecting to home page`);
    return NextResponse.redirect(new URL('/', requestUrl.origin))
  } catch (error) {
    console.error(`[AuthCallback ${timestamp}] Unexpected error in callback:`, error);
    if (error instanceof Error) {
      console.error(`[AuthCallback ${timestamp}] Error details:`, {
        message: error.message,
        stack: error.stack
      });
    }
    // Redirect to home on error
    return NextResponse.redirect(new URL('/', requestUrl.origin))
  }
} 