import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin))
  }

  const supabase = await createClient()
  
  try {
    // Exchange the code for a session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      console.error('Auth callback error during exchange:', exchangeError)
      return NextResponse.redirect(new URL('/login?error=auth', requestUrl.origin))
    }

    // Get the session to ensure it was properly set
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      console.error('Error getting session:', sessionError)
      return NextResponse.redirect(new URL('/login?error=session', requestUrl.origin))
    }

    // Get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('Error getting user:', userError)
      return NextResponse.redirect(new URL('/login?error=user', requestUrl.origin))
    }

    // Check admin status
    if (user.email) {
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', user.email)
        .single()

      if (adminError) {
        console.error('Error checking admin status:', adminError)
        // Non-critical error, continue to dashboard
        return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
      }

      if (adminData) {
        return NextResponse.redirect(new URL('/admin', requestUrl.origin))
      }
    }

    // Default to dashboard for authenticated users
    return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
  } catch (error) {
    console.error('Unexpected auth callback error:', error)
    return NextResponse.redirect(new URL('/login?error=auth', requestUrl.origin))
  }
} 