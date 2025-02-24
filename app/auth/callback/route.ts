import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'

  if (code) {
    const supabase = await createClient()
    
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        return NextResponse.redirect(new URL('/login?error=auth', requestUrl.origin))
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        return NextResponse.redirect(new URL('/login?error=auth', requestUrl.origin))
      }
      
      if (user?.email) {
        const { data: adminData, error: adminError } = await supabase
          .from('admin_users')
          .select('id')
          .eq('email', user.email)
          .single()

        if (adminError) {
          return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
        }

        if (adminData) {
          return NextResponse.redirect(new URL('/admin', requestUrl.origin))
        }
      }
    } catch (error) {
      return NextResponse.redirect(new URL('/login?error=auth', requestUrl.origin))
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin))
} 