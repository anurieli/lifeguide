import { createRouteHandlerClient } from '@/utils/supabase/route'
import { NextResponse } from 'next/server'

export async function POST() {
  // Create redirect response
  const response = NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_SITE_URL!), {
    status: 302,
  })

  const supabase = await createRouteHandlerClient(response)
  await supabase.auth.signOut()

  // Explicitly clear auth cookies
  response.cookies.delete('sb-access-token')
  response.cookies.delete('sb-refresh-token')
  
  // Set cache control headers to prevent caching
  response.headers.set('Cache-Control', 'no-store, max-age=0')

  return response
} 