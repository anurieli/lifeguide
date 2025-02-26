import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )

  await supabase.auth.signOut()

  // Create redirect response
  const response = NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_SITE_URL!), {
    status: 302,
  })

  // Explicitly clear auth cookies
  response.cookies.delete('sb-access-token')
  response.cookies.delete('sb-refresh-token')
  
  // Set cache control headers to prevent caching
  response.headers.set('Cache-Control', 'no-store, max-age=0')

  return response
} 