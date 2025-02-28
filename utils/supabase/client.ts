import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

// Cache the Supabase client instance
let supabaseInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  // If we already have an instance, return it
  if (supabaseInstance) {
    return supabaseInstance
  }

  // Otherwise create a new instance
  supabaseInstance = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  return supabaseInstance
} 