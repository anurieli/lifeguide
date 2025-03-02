'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  connectionState: 'connected' | 'error' | 'reconnecting';
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  signIn: async () => {},
  signOut: async () => {},
  refreshSession: async () => {},
  connectionState: 'connected',
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionState, setConnectionState] = useState<'connected' | 'error' | 'reconnecting'>('connected');
  const router = useRouter();
  const supabase = createClient();
  const initMounted = useRef(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  // Function to refresh the session
  const refreshSession = useCallback(async () => {
    const timestamp = new Date().toISOString();
    console.log(`[AUTH ${timestamp}] Refreshing session...`);
    try {
      setConnectionState('reconnecting');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error(`[AUTH ${timestamp}] Error refreshing session:`, error);
        console.error(`[AUTH ${timestamp}] Error details:`, {
          message: error.message,
          status: error.status,
          stack: error.stack
        });
        setConnectionState('error');
      } else {
        setConnectionState('connected');
        setUser(session?.user ?? null);
        setSession(session);
        console.log(`[AUTH ${timestamp}] Session refreshed successfully:`, {
          hasUser: !!session?.user,
          userId: session?.user?.id || 'none',
          aud: session?.user?.aud || 'none',
          expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'none'
        });
      }
    } catch (error) {
      console.error(`[AUTH ${timestamp}] Exception refreshing session:`, error);
      setConnectionState('error');
    }
  }, [supabase]);

  // Initialize auth state
  useEffect(() => {
    if (initMounted.current) return;
    initMounted.current = true;
    
    const initializeAuth = async () => {
      const timestamp = new Date().toISOString();
      console.log(`[AUTH ${timestamp}] Initializing auth...`);
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error(`[AUTH ${timestamp}] Error initializing session:`, error);
          console.error(`[AUTH ${timestamp}] Error details:`, {
            message: error.message,
            status: error.status,
            stack: error.stack
          });
          setConnectionState('error');
        } else {
          setUser(session?.user ?? null);
          setSession(session);
          setConnectionState('connected');
          console.log(`[AUTH ${timestamp}] Auth initialized:`, {
            hasUser: !!session?.user,
            userId: session?.user?.id || 'none',
            email: session?.user?.email || 'none',
            expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'none',
            cookiesEnabled: navigator.cookieEnabled,
            localStorage: typeof localStorage !== 'undefined',
            sessionStorage: typeof sessionStorage !== 'undefined'
          });
          
          // Debug: Check what cookies exist
          if (typeof document !== 'undefined') {
            console.log(`[AUTH ${timestamp}] Auth cookies:`, document.cookie.split('; ').map(c => c.split('=')[0]));
          }
        }
      } catch (error) {
        console.error(`[AUTH ${timestamp}] Exception initializing auth:`, error);
        setConnectionState('error');
      } finally {
        setLoading(false);
        setAuthLoaded(true);
      }
    };

    initializeAuth();
  }, [supabase]);

  // Set up auth state listener
  useEffect(() => {
    const timestamp = new Date().toISOString();
    console.log(`[AUTH ${timestamp}] Setting up auth state listener...`);
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
      const changeTimestamp = new Date().toISOString();
      console.log(`[AUTH ${changeTimestamp}] Auth state changed:`, {
        event,
        hasUser: !!session?.user,
        userId: session?.user?.id || 'none',
        email: session?.user?.email || 'none',
        provider: session?.user?.app_metadata?.provider || 'none',
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'none'
      });
      
      // Special logging for SIGNED_OUT event
      if (event === 'SIGNED_OUT') {
        console.log(`[AUTH ${changeTimestamp}] User signed out, checking cookies...`);
        if (typeof document !== 'undefined') {
          const hasSBCookies = document.cookie.includes('sb-');
          console.log(`[AUTH ${changeTimestamp}] Auth cookies still present after signout: ${hasSBCookies}`);
          
          if (hasSBCookies) {
            console.log(`[AUTH ${changeTimestamp}] Warning: Auth cookies still present after signout`);
          }
        }
      }
      
      // Special logging for SIGNED_IN event
      if (event === 'SIGNED_IN') {
        console.log(`[AUTH ${changeTimestamp}] User signed in, checking session...`);
        if (session) {
          console.log(`[AUTH ${changeTimestamp}] Session details:`, {
            providerToken: !!session.provider_token,
            accessToken: !!session.access_token,
            refreshToken: !!session.refresh_token,
            tokenType: session.token_type
          });
        }
      }
      
      setUser(session?.user ?? null);
      setSession(session);
      setLoading(false);
      setAuthLoaded(true);
      
      // If connection was in error state, update it
      if (connectionState === 'error') {
        setConnectionState(session ? 'connected' : 'disconnected');
      }
    });

    return () => {
      console.log(`[AUTH ${new Date().toISOString()}] Unsubscribing from auth state changes`);
      subscription.unsubscribe();
    };
  }, [supabase, connectionState]);

  // Refresh session periodically
  useEffect(() => {
    // Set up periodic session refresh to avoid auth issues
    const refreshInterval = setInterval(() => {
      refreshSession();
    }, 4 * 60 * 1000); // Refresh every 4 minutes

    return () => {
      clearInterval(refreshInterval);
    };
  }, [refreshSession]);

  // Handle network reconnection
  useEffect(() => {
    const handleOnline = () => {
      if (connectionState === 'error') {
        refreshSession();
      }
    };

    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [connectionState, refreshSession]);

  // Add dedicated session refresh effect
  useEffect(() => {
    const timestamp = new Date().toISOString();
    console.log(`[AUTH ${timestamp}] Session monitor setup (authLoaded: ${authLoaded}, hasUser: ${!!user})`);
    
    // Only run this after auth is loaded and if there's no user
    if (!authLoaded || user) return;
    
    // Check if we have auth cookies but no session
    const checkForCookiesWithoutSession = async () => {
      const timestamp = new Date().toISOString();
      try {
        if (typeof document === 'undefined') return;
        
        const hasSBCookies = document.cookie.includes('sb-');
        console.log(`[AUTH ${timestamp}] Auth cookies present without session: ${hasSBCookies}`);
        
        if (hasSBCookies) {
          console.log(`[AUTH ${timestamp}] Found cookies but no session, attempting refresh`);
          // Try to refresh the session
          await refreshSession();
          
          // Check if refresh worked
          const { data: { session }, error } = await supabase.auth.getSession();
          if (session) {
            console.log(`[AUTH ${timestamp}] Session recovered after refresh`);
            setUser(session.user);
            setSession(session);
          } else {
            console.log(`[AUTH ${timestamp}] Failed to recover session after refresh:`, error);
            // Clear cookies as they might be invalid
            await supabase.auth.signOut({ scope: 'local' });
          }
        }
      } catch (error) {
        console.error(`[AUTH ${timestamp}] Error checking/refreshing session:`, error);
      }
    };
    
    // Run the check
    checkForCookiesWithoutSession();
  }, [authLoaded, user, supabase]);
  
  // Add session expiry monitor
  useEffect(() => {
    if (!session) return;
    
    const timestamp = new Date().toISOString();
    const expiresAt = session.expires_at ? new Date(session.expires_at * 1000) : null;
    
    if (!expiresAt) {
      console.log(`[AUTH ${timestamp}] Session has no expiry time`);
      return;
    }
    
    const now = new Date();
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    
    // Refresh session 2 minutes before expiry
    const refreshTime = Math.max(timeUntilExpiry - (2 * 60 * 1000), 0);
    
    console.log(`[AUTH ${timestamp}] Session expires at: ${expiresAt.toISOString()}`);
    console.log(`[AUTH ${timestamp}] Will refresh in: ${Math.round(refreshTime / 1000 / 60)} minutes`);
    
    if (refreshTime < 5 * 60 * 1000) { // If less than 5 minutes left
      console.log(`[AUTH ${timestamp}] Session expiring soon, refreshing now`);
      refreshSession();
      return;
    }
    
    // Set up timer for later refresh
    const refreshTimer = setTimeout(() => {
      const newTimestamp = new Date().toISOString();
      console.log(`[AUTH ${newTimestamp}] Session refresh timer triggered`);
      refreshSession();
    }, refreshTime);
    
    return () => clearTimeout(refreshTimer);
  }, [session]);

  const signIn = async () => {
    const timestamp = new Date().toISOString();
    console.log(`[AUTH ${timestamp}] Initiating Google Sign In...`);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        console.error(`[AUTH ${timestamp}] Error initiating OAuth:`, error);
      } else {
        console.log(`[AUTH ${timestamp}] OAuth initiated, redirecting to provider:`, {
          provider: 'google',
          url: data?.url || 'unknown',
          returnToURL: `${window.location.origin}/auth/callback`
        });
      }
    } catch (error) {
      console.error(`[AUTH ${timestamp}] Exception during sign in:`, error);
    }
  };

  const signOut = async () => {
    const timestamp = new Date().toISOString();
    console.log(`[AUTH ${timestamp}] Sign out initiated`);
    
    if (typeof document !== 'undefined') {
      console.log(`[AUTH ${timestamp}] Cookies before sign out:`, document.cookie);
    }
    
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        console.error(`[AUTH ${timestamp}] Error signing out:`, error);
        console.error(`[AUTH ${timestamp}] Error details:`, {
          message: error.message,
          status: error.status
        });
        throw error;
      }
      
      // Clear local state
      setUser(null);
      setSession(null);
      
      // Debug: Check cookies after signout
      if (typeof document !== 'undefined') {
        console.log(`[AUTH ${timestamp}] Cookies after sign out:`, document.cookie);
        
        // Manual cookie clearing fallback - sometimes Supabase doesn't clear all cookies
        const cookiesToClear = [
          'sb-access-token', 
          'sb-refresh-token',
          'sb-provider-token',
          'sb-auth-event',
          'sb-auth-token',
          'mock_user', // Add mock_user to cookies to clear
          'sb-localhost-auth-token', // Also clear local dev tokens
          'sb-localhost-auth-token-code-verifier'
        ];
        
        console.log(`[AUTH ${timestamp}] Manually clearing cookies:`, cookiesToClear);
        
        // Clear each cookie with various paths to ensure complete removal
        cookiesToClear.forEach(name => {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/auth;`;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/dashboard;`;
          document.cookie = `${name}.0=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`; // Also clear indexed cookies
          document.cookie = `${name}.1=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        });
        
        // Also clear any project-specific cookies (using regex pattern)
        const allCookies = document.cookie.split('; ');
        allCookies.forEach(cookie => {
          const cookieName = cookie.split('=')[0];
          if (cookieName.includes('oibpypueiknfqnljgqjr')) {
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          }
        });
        
        console.log(`[AUTH ${timestamp}] Cookies after manual clear:`, document.cookie);
      }
      
      // Force a page reload to ensure clean state
      if (typeof window !== 'undefined') {
        console.log(`[AUTH ${timestamp}] Forcing page reload for clean state`);
        window.location.href = '/';
      }
      
      console.log(`[AUTH ${timestamp}] Sign out completed`);
    } catch (error) {
      console.error(`[AUTH ${timestamp}] Unexpected error during sign out:`, error);
      if (error instanceof Error) {
        console.error(`[AUTH ${timestamp}] Error details:`, {
          message: error.message,
          stack: error.stack
        });
      }
      throw error;
    }
  };

  const isAdmin = user?.email === 'anurieli365@gmail.com' || user?.role === 'admin';

  return (
    <AuthContext.Provider 
      value={{
        user,
        loading,
        isAdmin,
        signIn,
        signOut,
        refreshSession,
        connectionState
      }}
    >
      {connectionState === 'error' && !loading && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-2 text-center z-50">
          Connection issues detected. <button onClick={refreshSession} className="underline">Try reconnecting</button>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
}; 