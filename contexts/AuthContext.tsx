'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

// Mock user for development
const MOCK_USER: User = {
  id: '553c0461-0bc6-4d18-9142-b0e63edc0d2c',
  email: 'anurieli365@gmail.com',
  role: 'admin',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString()
};

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

  // Function to refresh the session
  const refreshSession = useCallback(async () => {
    console.log('Refreshing session...');
    try {
      setConnectionState('reconnecting');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error refreshing session:', error);
        setConnectionState('error');
      } else {
        setConnectionState('connected');
        setUser(session?.user ?? null);
        console.log('Session refreshed successfully', !!session?.user);
      }
    } catch (error) {
      console.error('Exception refreshing session:', error);
      setConnectionState('error');
    }
  }, [supabase]);

  // Initialize auth state
  useEffect(() => {
    if (initMounted.current) return;
    initMounted.current = true;
    
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error initializing session:', error);
          setConnectionState('error');
        } else {
          setUser(session?.user ?? null);
          setConnectionState('connected');
          console.log('Auth initialized with user:', !!session?.user);
        }
      } catch (error) {
        console.error('Exception initializing auth:', error);
        setConnectionState('error');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [supabase]);

  // Set up auth state listener
  useEffect(() => {
    console.log('Setting up auth state listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
      console.log('Auth state changed:', event, !!session?.user);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session) {
        setConnectionState('connected');
      }
      
      // Redirect based on auth state if needed
      if (event === 'SIGNED_IN') {
        router.refresh();
      } else if (event === 'SIGNED_OUT') {
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

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

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear local state
      setUser(null);
      
      // Force a hard refresh to clear any cached data
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
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