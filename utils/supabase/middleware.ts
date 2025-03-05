import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export const updateSession = async (request: NextRequest) => {
  try {
    // Create a Supabase client with the request cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
          remove(name, options) {
            request.cookies.set({
              name,
              value: "",
              ...options,
            });
          },
        },
      }
    );

    // Create a response that will be modified with the session
    const supabaseResponse = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    // This will refresh session if expired - required for Server Components
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Check if user is authenticated for protected routes
    if (
      !user &&
      !request.nextUrl.pathname.startsWith('/login') &&
      !request.nextUrl.pathname.startsWith('/auth')
    ) {
      // Redirect unauthenticated users to login page
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    // Redirect authenticated users from home page to dashboard
    if (request.nextUrl.pathname === "/" && user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // IMPORTANT: You must return the supabaseResponse object as it is
    return supabaseResponse;
    
  } catch (e) {
    console.error("Supabase client error:", e);
    // If Supabase client could not be created, return a basic response
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};
