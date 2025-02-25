import { createBrowserClient } from '@supabase/ssr'
import type { Session, User } from '@supabase/supabase-js'

const isDev = process.env.NODE_ENV === 'development'

// Development credentials
const DEV_EMAIL = 'anurieli365@gmail.com'
const DEV_USER_ID = '553c0461-0bc6-4d18-9142-b0e63edc0d2c'

export function createClient() {
  console.log('Creating Supabase client...')
  console.log('Development mode:', isDev)
  
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // In development, ensure we're signed in as the dev user
  if (isDev) {
    console.log('Checking development authentication...')
    client.auth.getSession().then(async ({ data: { session } }) => {
      console.log('Current session:', session ? `Logged in as ${session.user.email}` : 'No session')
      
      // If we're not signed in or signed in as a different user, sign in as dev user
      if (!session?.user || session.user.id !== DEV_USER_ID) {
        console.log('Attempting to sign in as development user:', DEV_EMAIL)
        try {
          const { data, error } = await client.auth.signInWithPassword({
            email: DEV_EMAIL,
            password: process.env.NEXT_PUBLIC_DEV_PASSWORD!
          })
          
          if (error) {
            console.error('Development auth error:', error.message)
            console.log('Please ensure:')
            console.log('1. The user exists in Supabase Auth')
            console.log('2. The password matches NEXT_PUBLIC_DEV_PASSWORD')
            console.log('3. The user ID matches the authenticated user')
          } else {
            console.log('Successfully signed in as development user:', data.user?.email)
            console.log('User ID:', data.user?.id)
          }
        } catch (error) {
          console.error('Development auth error:', error)
        }
      } else {
        console.log('Already signed in as development user')
      }
    })
  }

  return client
} 