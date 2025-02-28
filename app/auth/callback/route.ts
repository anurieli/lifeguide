import { createRouteHandlerClient } from '@/utils/supabase/route'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const returnTo = requestUrl.searchParams.get('returnTo') || '/dashboard'

  if (code) {
    const response = NextResponse.redirect(new URL(returnTo, requestUrl.origin))
    const supabase = await createRouteHandlerClient(response)

    await supabase.auth.exchangeCodeForSession(code)
    return response
  }

  // If no code is present, redirect to home page
  return NextResponse.redirect(new URL('/', requestUrl.origin))
} 