import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If user is not signed in and the current path is not / or /auth,
  // redirect the user to /
  if (!session && req.nextUrl.pathname !== '/' && !req.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // If user is signed in and the current path is /auth,
  // redirect the user to /dashboard
  if (session && req.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // For admin routes, check if the user is authenticated and is an admin
  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/', req.url))
    }
    
    // Get user's email from session
    const email = session.user?.email
    if (!email) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    // Check if user is an admin (this will be enforced by RLS policies)
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .single()

    if (!adminUser) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 