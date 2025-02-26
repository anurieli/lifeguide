import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // List of public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/auth', '/about', '/guide']
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname === route || 
    request.nextUrl.pathname.startsWith('/auth/') ||
    request.nextUrl.pathname.startsWith('/guide/')
  )

  // Create a response early with default headers
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Set cache control headers
  response.headers.set('Cache-Control', 'no-store, max-age=0')

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Allow access to public routes regardless of auth status
    if (isPublicRoute) {
      return response
    }

    // If user is not signed in and trying to access protected route,
    // redirect to login
    if (!user && !isPublicRoute) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('returnTo', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // If user is signed in and trying to access login page,
    // redirect to dashboard
    if (user && request.nextUrl.pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Check for admin routes
    if (request.nextUrl.pathname.startsWith('/admin')) {
      const isAdmin = user?.email === 'anurieli365@gmail.com' || user?.role === 'admin'
      if (!isAdmin) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    return response
  } catch (error) {
    console.error('Middleware error:', error)
    
    // If there's an error checking auth status and we're not on a public route,
    // clear auth cookies and redirect to home
    if (!isPublicRoute) {
      const response = NextResponse.redirect(new URL('/', request.url))
      response.cookies.delete('sb-access-token')
      response.cookies.delete('sb-refresh-token')
      return response
    }
    
    return response
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