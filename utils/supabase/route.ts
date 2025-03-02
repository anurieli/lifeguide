import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Database } from '@/types/supabase'

export async function createRouteHandlerClient(response?: NextResponse) {
  const timestamp = new Date().toISOString();
  console.log(`[RouteHandler ${timestamp}] Creating route handler client${response ? ' with response' : ' without response'}`);
  
  const cookieStore = await cookies();
  
  // Log available cookies
  const allCookies = cookieStore.getAll();
  const authCookies = allCookies.filter(c => 
    c.name.startsWith('sb-') || 
    c.name.includes('auth') || 
    c.name.includes('supabase')
  );
  
  console.log(`[RouteHandler ${timestamp}] Available auth cookies (${authCookies.length}):`, 
    authCookies.map(c => ({
      name: c.name,
      value: c.name.includes('token') ? `${c.value.substring(0, 10)}...` : 'present',
      present: Boolean(c.value)
    }))
  );
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          console.log(`[RouteHandler ${timestamp}] Getting all cookies`);
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          console.log(`[RouteHandler ${timestamp}] Setting cookies:`, 
            cookiesToSet.map(c => ({
              name: c.name,
              value: c.name.includes('token') ? `${c.value.substring(0, 10)}...` : 'present',
              options: c.options
            }))
          );
          
          if (response) {
            // If we have a response object, set cookies on it
            console.log(`[RouteHandler ${timestamp}] Setting cookies on response object`);
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          } else {
            // Otherwise set cookies on the cookie store
            console.log(`[RouteHandler ${timestamp}] Setting cookies on cookie store`);
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch (error) {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
              console.warn(`[RouteHandler ${timestamp}] Warning: Could not set cookies on cookie store. This is normal if called from Server Component.`);
              if (error instanceof Error) {
                console.warn(`[RouteHandler ${timestamp}] Error details:`, {
                  message: error.message,
                  stack: error.stack
                });
              }
            }
          }
        },
      },
    }
  )
} 