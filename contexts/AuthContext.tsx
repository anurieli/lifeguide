'use client';

import { createContext, useContext, useEffect, useState, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

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

function AuthProviderContent({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    return () => {
      setMounted(false);
    };
  }, []);

  const checkAdminStatus = async (email: string | undefined) => {
    if (!email) return false;
    
    try {
      console.log('Checking admin status for:', email);
      const { data: adminData, error } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', email)
        .single();

      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }

      console.log('Admin check result:', !!adminData);
      return !!adminData;
    } catch (error) {
      console.error('Error in checkAdminStatus:', error);
      return false;
    }
  };

  const handleAuthChange = async (event: AuthChangeEvent, session: Session | null) => {
    console.log('Auth state changed:', { event, session });
    try {
      if (!mounted) {
        console.log('Component not mounted, skipping auth change');
        return;
      }

      setLoading(true);
      
      if (event === 'SIGNED_OUT' || !session?.user) {
        console.log('User signed out or no session');
        setUser(null);
        setIsAdmin(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('Processing sign in or token refresh');
        console.log('Session user:', session.user);
        setUser(session.user);
        const adminStatus = await checkAdminStatus(session.user.email);
        console.log('Setting admin status:', adminStatus);
        setIsAdmin(adminStatus);
      }
    } catch (error) {
      console.error('Error in handleAuthChange:', error);
      // Don't reset user state on non-critical errors
    } finally {
      if (mounted) {
        console.log('Finishing auth change, setting loading to false');
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      console.log('Initializing auth state');
      try {
        if (!mounted) {
          console.log('Component not mounted, skipping initialization');
          return;
        }

        setLoading(true);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('Got initial session:', { session, error: sessionError });
        
        if (sessionError) {
          console.error('Error getting initial session:', sessionError);
          if (mounted) {
            setUser(null);
            setIsAdmin(false);
          }
          return;
        }

        if (!session?.user) {
          console.log('No initial session or user found');
          if (mounted) {
            setUser(null);
            setIsAdmin(false);
          }
          return;
        }

        if (mounted) {
          console.log('Setting initial user:', session.user);
          setUser(session.user);
          const adminStatus = await checkAdminStatus(session.user.email);
          console.log('Setting initial admin status:', adminStatus);
          if (mounted) {
            setIsAdmin(adminStatus);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setUser(null);
          setIsAdmin(false);
        }
      } finally {
        if (mounted) {
          console.log('Finishing initialization, setting loading to false');
          setLoading(false);
        }
      }
    };

    console.log('Setting up auth subscriptions');
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(handleAuthChange);

    initialize();

    return () => {
      console.log('Cleaning up auth subscriptions');
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async () => {
    try {
      console.log('Starting sign in process');
      setLoading(true);
      const returnTo = searchParams?.get('returnTo');
      console.log('Return URL:', returnTo);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback${returnTo ? `?returnTo=${returnTo}` : ''}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      console.log('Sign in response:', { data, error });
      if (error) throw error;
      
    } catch (error) {
      console.error('Error in signIn:', error);
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('Starting sign out process');
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setIsAdmin(false);
      router.push('/');
    } catch (error) {
      console.error('Error in signOut:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthProviderContent>{children}</AuthProviderContent>
    </Suspense>
  );
}; 