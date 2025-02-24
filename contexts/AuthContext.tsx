'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { User, AuthChangeEvent } from '@supabase/supabase-js';
import { debug } from '@/lib/debug';

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
      debug.warn('No email provided for admin check');
      return false;
    }
    
    try {
      debug.auth('Checking admin status for:', email);
      const { data: adminData, error } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', email)
        .single();

      if (error) {
        debug.error('Error checking admin status:', error);
        return false;
      }

      const isAdminUser = !!adminData;
      debug.auth('Admin status result:', { email, isAdmin: isAdminUser });
      return isAdminUser;
    } catch (error) {
      debug.error('Error in checkAdminStatus:', error);
      return false;
    }
  };

  const handleAuthChange = async (event: AuthChangeEvent, session: any) => {
    debug.auth('Auth state changed:', { 
      event, 
      email: session?.user?.email,
      hasSession: !!session,
      hasUser: !!session?.user 
    });
    
    if (event === 'SIGNED_OUT' || !session) {
      debug.auth('User signed out or no session');
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    if (session?.user) {
      debug.auth('Setting user:', session.user.email);
      setUser(session.user);
      const adminStatus = await checkAdminStatus(session.user.email);
      debug.auth('Setting admin status:', adminStatus);
      setIsAdmin(adminStatus);
    } else {
      debug.auth('No user in session');
      setUser(null);
      setIsAdmin(false);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        debug.auth('Initializing auth...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          debug.error('Error getting session:', error);
          return;
        }

        if (!mounted) {
          debug.warn('Component unmounted during initialization');
          return;
        }

        debug.auth('Initial session:', {
          hasSession: !!session,
          email: session?.user?.email
        });

        if (session?.user) {
          debug.auth('Setting initial user:', session.user.email);
          setUser(session.user);
          const adminStatus = await checkAdminStatus(session.user.email);
          if (mounted) {
            debug.auth('Setting initial admin status:', adminStatus);
            setIsAdmin(adminStatus);
          }
        } else {
          debug.auth('No initial user found');
        }
      } catch (error) {
        debug.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          debug.auth('Finishing initialization, setting loading false');
          setLoading(false);
        }
      }
    };

    initialize();

    debug.auth('Setting up auth state change listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    return () => {
      debug.auth('Cleaning up auth provider');
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async () => {
    try {
      debug.auth('Starting sign in process');
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
        debug.error('Sign in error:', error);
        throw error;
      }
      debug.auth('Sign in initiated successfully');
    } catch (error) {
      debug.error('Error in signIn:', error);
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      debug.auth('Starting sign out process');
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        debug.error('Sign out error:', error);
        throw error;
      }
      
      debug.auth('Sign out successful, clearing state');
      setUser(null);
      setIsAdmin(false);
      router.push('/');
    } catch (error) {
      debug.error('Error in signOut:', error);
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