'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

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
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  signIn: async () => {},
  signOut: async () => {},
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
  const supabase = createClient();

  useEffect(() => {
    // Check active session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

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
      // First clear the auth state locally
      setUser(null);
      setLoading(false);

      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear any cached data or state
      if (typeof window !== 'undefined') {
        // Clear any local storage items
        localStorage.clear();
        sessionStorage.clear();
        
        // Force a hard refresh and redirect to home
        window.location.replace('/');
      }
    } catch (error) {
      console.error('Error signing out:', error);
      // Force reload even if there's an error
      window.location.replace('/');
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
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 