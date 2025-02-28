import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/supabase'

export function createClient(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  return {
    supabase: createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // First set cookies on the request
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value)
            })
            
            // Then create a new response with those cookies
            response = NextResponse.next({
              request,
            })
            
            // Finally set cookies on the response with full options
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    ),
    response,
  }
} 