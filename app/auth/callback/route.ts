import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { debug } from '@/lib/debug'

// Helper function to safely stringify errors
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'

  debug.auth('Auth callback received:', { 
    hasCode: !!code,
    next,
    url: request.url 
  });

  if (code) {
    const supabase = await createClient()
    
    try {
      debug.auth('Exchanging code for session');
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        debug.error('Auth callback error during exchange:', error.message)
        return NextResponse.redirect(new URL('/login?error=auth', requestUrl.origin))
      }

      // Get the user to check admin status
      debug.auth('Getting user after session exchange');
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        debug.error('Error getting user:', userError.message);
        return NextResponse.redirect(new URL('/login?error=auth', requestUrl.origin))
      }

      debug.auth('User retrieved:', { email: user?.email });
      
      if (user?.email) {
        debug.auth('Checking admin status');
        const { data: adminData, error: adminError } = await supabase
          .from('admin_users')
          .select('id')
          .eq('email', user.email)
          .single()

        if (adminError) {
          debug.error('Error checking admin status:', adminError.message);
        } else {
          debug.auth('Admin check result:', { isAdmin: !!adminData });
        }

        // If user is admin, redirect to admin page
        if (adminData) {
          debug.auth('Redirecting admin to admin page');
          return NextResponse.redirect(new URL('/admin', requestUrl.origin))
        }
      }
    } catch (error) {
      debug.error('Unexpected auth callback error:', getErrorMessage(error))
      return NextResponse.redirect(new URL('/login?error=auth', requestUrl.origin))
    }
  }

  debug.auth('Redirecting to:', next);
  return NextResponse.redirect(new URL(next, requestUrl.origin))
} 