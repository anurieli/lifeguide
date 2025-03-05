import { updateSession } from '@/utils/supabase/middleware'
import { type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

// Specify which routes should be protected by the middleware
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*'
  ],
} 