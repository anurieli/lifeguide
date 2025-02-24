import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  console.log('Auth callback initiated');
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const returnTo = requestUrl.searchParams.get('returnTo') || '/dashboard'
  
  console.log('Auth callback params:', { code: !!code, returnTo });

  if (!code) {
    console.error('No code provided in callback');
    return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin))
  }

  const supabase = await createClient()
  
  try {
    console.log('Exchanging code for session');
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      console.error('Auth callback error during exchange:', exchangeError)
      return NextResponse.redirect(new URL('/login?error=auth', requestUrl.origin))
    }

    console.log('Getting session after exchange');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      console.error('Error getting session:', sessionError)
      return NextResponse.redirect(new URL('/login?error=session', requestUrl.origin))
    }

    console.log('Getting user after session');
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('Error getting user:', userError)
      return NextResponse.redirect(new URL('/login?error=user', requestUrl.origin))
    }

    console.log('Checking admin status for:', user.email);
    if (user.email) {
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', user.email)
        .single()

      if (adminError) {
        console.error('Error checking admin status:', adminError)
        console.log('Redirecting to:', returnTo);
        return NextResponse.redirect(new URL(returnTo, requestUrl.origin))
      }

      if (adminData) {
        if (returnTo.startsWith('/admin')) {
          console.log('Admin user accessing admin page, redirecting to:', returnTo);
          return NextResponse.redirect(new URL(returnTo, requestUrl.origin))
        }
        console.log('Admin user, redirecting to admin dashboard');
        return NextResponse.redirect(new URL('/admin', requestUrl.origin))
      }
    }

    console.log('Regular user, redirecting to:', returnTo);
    return NextResponse.redirect(new URL(returnTo, requestUrl.origin))
  } catch (error) {
    console.error('Unexpected error in auth callback:', error)
    return NextResponse.redirect(new URL('/login?error=unknown', requestUrl.origin))
  }
} 