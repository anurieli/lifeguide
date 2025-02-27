'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Session, User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

// Create context types with proper typing
type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  error: string | null
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

// Default context values
const defaultContext: AuthContextType = {
  user: null,
  session: null,
  isLoading: true,
  error: null,
  signOut: async () => {},
  refreshSession: async () => {},
}

// Create the context
const AuthContext = createContext<AuthContextType>(defaultContext)

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// The AuthProvider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  // Function to refresh the session
  const refreshSession = async () => {
    try {
      console.log('Refreshing session')
      setIsLoading(true)
      
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error refreshing session:', error.message)
        setError(error.message)
        setUser(null)
        setSession(null)
      } else {
        console.log('Session refreshed:', data.session ? 'Has session' : 'No session')
        setSession(data.session)
        setUser(data.session?.user ?? null)
        setError(null)
      }
    } catch (e) {
      console.error('Unexpected error during session refresh:', e)
      setError(e instanceof Error ? e.message : 'Unknown error refreshing session')
      setUser(null)
      setSession(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Function to sign out
  const signOut = async () => {
    try {
      console.log('Signing out')
      setIsLoading(true)
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Error signing out:', error.message)
        setError(error.message)
      } else {
        console.log('Signed out successfully')
        setUser(null)
        setSession(null)
        setError(null)
        
        // Force a router refresh to update UI
        router.refresh()
      }
    } catch (e) {
      console.error('Unexpected error during sign out:', e)
      setError(e instanceof Error ? e.message : 'Unknown error signing out')
    } finally {
      setIsLoading(false)
    }
  }

  // Set up auth state listener
  useEffect(() => {
    console.log('Setting up auth state listener')
    
    // Initial session check
    refreshSession()
    
    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session ? 'Has session' : 'No session')
      
      setSession(session)
      setUser(session?.user ?? null)
      
      // Force router refresh on auth events
      if (['SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
        router.refresh()
      }
    })
    
    // Cleanup listener on unmount
    return () => {
      console.log('Cleaning up auth listener')
      authListener.subscription.unsubscribe()
    }
  }, [])

  // Values to provide to consumers
  const value = {
    user,
    session,
    isLoading,
    error,
    signOut,
    refreshSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
} 