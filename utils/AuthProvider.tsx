'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshSession: (manualUserState?: User | null) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Check if we're in an auth transition or refresh
  const isAuthTransition = typeof window !== 'undefined' && 
    window.location.search.includes('auth_transition=true');
  const isRefresh = typeof window !== 'undefined' && 
    window.location.search.includes('refresh=true');

  useEffect(() => {
    // If we detect a refresh parameter (sign-out), clear any cached user state immediately
    if (isRefresh) {
      console.log('[AuthProvider] Refresh parameter detected, clearing user state');
      setUser(null);
      
      // Clear any auth-related cookies manually as an extra precaution
      if (typeof window !== 'undefined') {
        console.log('[AuthProvider] Manually clearing auth cookies');
        
        // Get the project ID from the NEXT_PUBLIC_SUPABASE_URL
        const projectId = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^\.]+)\./)?.[1];
        console.log('[AuthProvider] Project ID for cookie clearing:', projectId);
        
        if (projectId) {
          // Clear project-specific cookies
          document.cookie = `sb-${projectId}-auth-token.0=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=lax`;
          document.cookie = `sb-${projectId}-auth-token.1=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=lax`;
        }
        
        // Also clear legacy cookie names as fallback
        document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=lax';
        document.cookie = 'sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=lax';
        document.cookie = 'supabase-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=lax';
        
        // Remove the refresh parameter from the URL
        const url = new URL(window.location.href);
        url.searchParams.delete('refresh');
        url.searchParams.delete('timestamp');
        window.history.replaceState({}, '', url.toString());
        
        // Force a reload of the page to ensure all components get fresh state
        window.location.reload();
      }
    }
  }, [isRefresh]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('[AuthProvider] Initializing auth...');
        
        // If we're in an auth transition, we need to be more patient
        if (isAuthTransition) {
          console.log('[AuthProvider] Auth transition detected, waiting for session to stabilize...');
          // Remove the auth_transition parameter from the URL
          const url = new URL(window.location.href);
          url.searchParams.delete('auth_transition');
          window.history.replaceState({}, '', url.toString());
        }
        
        // Log all cookies for debugging
        if (typeof window !== 'undefined') {
          console.log('[AuthProvider] Cookies before getSession:', document.cookie);
        }
        
        // Check current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('[AuthProvider] getSession result:', session ? 'Session found' : 'No session', 
                    'Error:', sessionError ? sessionError.message : 'None');
        
        if (sessionError) {
          console.error('[AuthProvider] Error getting session:', sessionError);
          setError('Failed to get session');
          
          // If we're in an auth transition, try again after a short delay
          if (isAuthTransition) {
            console.log('[AuthProvider] Will retry in 1 second due to auth transition');
            setTimeout(initializeAuth, 1000);
            return;
          }
          
          setLoading(false);
          return;
        }
        
        if (session) {
          console.log('[AuthProvider] Session found, user is authenticated:', session.user.email);
          console.log('[AuthProvider] User details:', JSON.stringify(session.user, null, 2));
          setUser(session.user);
        } else {
          console.log('[AuthProvider] No session found, user is not authenticated');
          
          // Check for auth cookies even if no session is found
          const projectId = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^\.]+)\./)?.[1];
          const hasCookies = document.cookie.includes(`sb-${projectId}-auth-token`);
          console.log(`[AuthProvider] Auth cookies present: ${hasCookies}, projectId: ${projectId}`);
          
          // If we're in an auth transition but don't have a session yet, try again
          if (isAuthTransition) {
            console.log('[AuthProvider] Auth transition but no session yet, retrying in 1 second...');
            setTimeout(initializeAuth, 1000);
            return;
          }
          
          // Try to get user directly if we have cookies but no session
          if (hasCookies) {
            console.log('[AuthProvider] Auth cookies present but no session, trying getUser...');
            const { data: userData, error: userError } = await supabase.auth.getUser();
            
            if (userData?.user) {
              console.log('[AuthProvider] User found via getUser:', userData.user.email);
              setUser(userData.user);
              return;
            } else {
              console.log('[AuthProvider] No user found via getUser, error:', userError?.message);
            }
          }
          
          setUser(null);
        }
      } catch (err) {
        console.error('[AuthProvider] Error initializing auth:', err);
        setError('Failed to initialize authentication');
      } finally {
        if (!isAuthTransition) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthProvider] Auth state change:', event, session ? `User: ${session.user.email}` : 'No user session');
      
      if (event === 'SIGNED_IN') {
        console.log('[AuthProvider] User signed in, updating user state');
        setUser(session?.user || null);
        setLoading(false); // Ensure loading is set to false
        router.refresh();
      } else if (event === 'SIGNED_OUT') {
        console.log('[AuthProvider] User signed out, clearing user state');
        setUser(null);
        setLoading(false); // Ensure loading is set to false
        
        // Force router refresh to update UI components immediately
        router.refresh();
        
        // Clear any auth-related cookies manually as an extra precaution
        if (typeof window !== 'undefined') {
          console.log('[AuthProvider] Manually clearing auth cookies after SIGNED_OUT event');
          
          // Get the project ID from the NEXT_PUBLIC_SUPABASE_URL
          const projectId = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^\.]+)\./)?.[1];
          console.log('[AuthProvider] Project ID for cookie clearing:', projectId);
          
          if (projectId) {
            // Clear project-specific cookies
            document.cookie = `sb-${projectId}-auth-token.0=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=lax`;
            document.cookie = `sb-${projectId}-auth-token.1=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=lax`;
          }
          
          // Also clear legacy cookie names as fallback
          document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=lax';
          document.cookie = 'sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=lax';
          document.cookie = 'supabase-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=lax';
          
          // We'll let the server action handle the redirect, but set a timeout as a fallback
          console.log('[AuthProvider] Setting fallback redirect timeout');
          setTimeout(() => {
            // Only redirect if we're still on the same page after 2 seconds
            console.log('[AuthProvider] Checking if redirect is needed');
            window.location.href = `/?refresh=true&timestamp=${Date.now()}`;
          }, 2000);
        } else {
          router.refresh();
        }
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('[AuthProvider] Token refreshed, updating user state');
        setUser(session?.user || null);
        setLoading(false); // Ensure loading is set to false
      } else if (event === 'USER_UPDATED') {
        console.log('[AuthProvider] User updated, updating user state');
        setUser(session?.user || null);
        setLoading(false); // Ensure loading is set to false
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase.auth, isAuthTransition]);

  const refreshSession = async (manualUserState?: User | null) => {
    try {
      // If a user state is manually provided, use it immediately (for immediate UI updates)
      if (manualUserState !== undefined) {
        console.log(`[AuthProvider] Manually setting user state to:`, manualUserState ? 'User object' : 'null');
        setUser(manualUserState);
        
        // For OAuth sign-out (null user), we need to be more aggressive
        if (manualUserState === null) {
          console.log('[AuthProvider] OAuth sign-out detected, forcing session clear');
          
          // Clear any auth-related cookies manually as an extra precaution
          if (typeof window !== 'undefined') {
            // Get the project ID from the NEXT_PUBLIC_SUPABASE_URL
            const projectId = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^\.]+)\./)?.[1];
            console.log('[AuthProvider] Project ID for cookie clearing:', projectId);
            
            if (projectId) {
              // Clear project-specific cookies
              document.cookie = `sb-${projectId}-auth-token.0=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=lax`;
              document.cookie = `sb-${projectId}-auth-token.1=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=lax`;
            }
            
            // Also clear legacy cookie names as fallback
            document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=lax';
            document.cookie = 'sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=lax';
            document.cookie = 'supabase-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=lax';
          }
          
          // Force router refresh
          router.refresh();
        }
        return;
      }
      
      setLoading(true);
      console.log('[AuthProvider] Refreshing session...');
      
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('[AuthProvider] Error refreshing session:', error);
        setError('Failed to refresh session');
        setUser(null); // Clear user state on refresh error
      } else if (data && data.session) {
        console.log('[AuthProvider] Session refreshed successfully');
        setUser(data.user);
      } else {
        console.log('[AuthProvider] No session after refresh, user is not authenticated');
        setUser(null);
      }
    } catch (err) {
      console.error('[AuthProvider] Unexpected error during session refresh:', err);
      setError('Unexpected error during session refresh');
      setUser(null); // Clear user state on refresh error
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 