import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Mock user for development - matching the one in AuthContext
const MOCK_USER = {
  id: 'b4b92493-74d6-4a14-a73b-7107eb0eab84',
  email: 'anurieli365@gmail.com',
  role: 'admin'
};

export async function middleware(request: NextRequest) {
  // Get the pathname
  const path = request.nextUrl.pathname;

  // Create a response with the mock user session
  const response = NextResponse.next();
  
  // Add mock session data to the response
  response.cookies.set('mock_user', JSON.stringify(MOCK_USER));

  // Always allow access since we're using a mock user
  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/guide/:path*',
    '/auth/:path*'
  ]
}; 