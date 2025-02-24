'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { User, AuthChangeEvent } from '@supabase/supabase-js';

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const checkAdminStatus = async (email: string | undefined) => {
    if (!email) {
      return false;
    }
    
    try {
      const { data: adminData, error } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', email)
        .single();

      if (error) {
        return false;
      }

      return !!adminData;
    } catch (error) {
      return false;
    }
  };

  const handleAuthChange = async (event: AuthChangeEvent, session: any) => {
    if (event === 'SIGNED_OUT' || !session) {
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    if (session?.user) {
      setUser(session.user);
      const adminStatus = await checkAdminStatus(session.user.email);
      setIsAdmin(adminStatus);
    } else {
      setUser(null);
      setIsAdmin(false);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !mounted) {
          return;
        }

        if (session?.user) {
          setUser(session.user);
          const adminStatus = await checkAdminStatus(session.user.email);
          if (mounted) {
            setIsAdmin(adminStatus);
          }
        }
      } catch (error) {
        // Handle error silently
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      
      setUser(null);
      setIsAdmin(false);
      router.push('/');
    } catch (error) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}; 