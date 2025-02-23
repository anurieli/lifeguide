'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createBrowserSupabaseClient } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  devSignIn?: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes on auth state (signed in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem('dev-user');
  };

  const devSignIn = async () => {
    if (process.env.NODE_ENV === 'development') {
      const mockUser = {
        id: 'dev-user',
        email: 'dev@example.com',
        phone: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        role: 'authenticated',
        aud: 'authenticated',
        app_metadata: { provider: 'email' },
        user_metadata: { 
          name: 'Dev User',
          isAdmin: true
        },
        identities: [],
        factors: []
      } as User;

      // Store mock user data in localStorage to persist across refreshes
      localStorage.setItem('dev-user', JSON.stringify(mockUser));
      setUser(mockUser);
    }
  };

  // Load mock user data from localStorage in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !user) {
      const storedUser = localStorage.getItem('dev-user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
  }, [user]);

  const value = {
    user,
    loading,
    signIn,
    signOut,
    ...(process.env.NODE_ENV === 'development' && { devSignIn }),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 