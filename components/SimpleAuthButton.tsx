'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState, useTransition } from 'react';
import { signOutAction } from '@/utils/supabase/actions';
import { useAuth } from '@/utils/AuthProvider';

export default function SimpleAuthButton() {
  const { user, loading, error, isRecoverySession, refreshSession } = useAuth();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[SimpleAuthButton] Auth state change:', event);
      
      // Refresh the router when auth state changes
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        console.log('[SimpleAuthButton] Refreshing router after auth state change');
        router.refresh();
        
        // Force a full page reload on sign-out to ensure all state is cleared
        if (event === 'SIGNED_OUT') {
          console.log('[SimpleAuthButton] Detected SIGNED_OUT event, forcing page reload');
          window.location.href = '/';
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase.auth]);

  // Special handler for cancelling password reset mode
  const handleCancelRecovery = async () => {
    try {
      console.log('[SimpleAuthButton] Cancelling password recovery session');
      
      // Sign out to clear the recovery session
      await supabase.auth.signOut({ scope: 'global' });
      
      // Clear recovery flag in local storage
      localStorage.removeItem('auth_recovery_session');
      
      // Immediately update UI state
      refreshSession(null);
      
      // Redirect to login
      router.push('/auth/login');
      
      // Force a full page reload to ensure clean state
      setTimeout(() => {
        window.location.href = '/auth/login';
      }, 100);
      
    } catch (err) {
      console.error('[SimpleAuthButton] Error cancelling recovery session:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      const timestamp = Date.now();
      console.log(`[AuthButton ${new Date(timestamp).toISOString()}] Sign-out initiated`);
      
      // Log cookies before sign-out for debugging
      if (typeof window !== 'undefined') {
        console.log(`[AuthButton ${new Date(timestamp).toISOString()}] Cookies before sign-out:`, document.cookie);
      }
      
      // IMPORTANT: Immediately update the UI by setting user to null
      console.log(`[AuthButton ${new Date(timestamp).toISOString()}] Immediately updating UI state to signed out`);
      refreshSession(null);
      
      // Perform client-side sign out first for immediate effect
      try {
        console.log(`[AuthButton ${new Date(timestamp).toISOString()}] Calling supabase.auth.signOut()`);
        const { error } = await supabase.auth.signOut({ scope: 'global' });
        
        if (error) {
          console.error(`[AuthButton ${new Date(timestamp).toISOString()}] Error with client-side sign out:`, error);
        } else {
          console.log(`[AuthButton ${new Date(timestamp).toISOString()}] Client-side sign out successful`);
        }
      } catch (error) {
        console.error(`[AuthButton ${new Date(timestamp).toISOString()}] Error in client-side sign out:`, error);
      }
      
      // Clear cookies manually for immediate effect
      if (typeof window !== 'undefined') {
        // Get the project ID from the NEXT_PUBLIC_SUPABASE_URL
        const projectId = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^\.]+)\./)?.[1];
        console.log(`[AuthButton ${new Date(timestamp).toISOString()}] Project ID for cookie clearing:`, projectId);
        
        if (projectId) {
          // Clear project-specific cookies
          document.cookie = `sb-${projectId}-auth-token.0=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=lax`;
          document.cookie = `sb-${projectId}-auth-token.1=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=lax`;
        }
        
        // Also clear legacy cookie names as fallback
        document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=lax';
        document.cookie = 'sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=lax';
        document.cookie = 'supabase-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=lax';
        
        // Log cookies after clearing
        console.log(`[AuthButton ${new Date(timestamp).toISOString()}] Cookies after clearing:`, document.cookie);
      }
      
      // Force router refresh to update UI components
      router.refresh();
      
      // For OAuth providers like Google, we need to be more aggressive with sign-out
      // Force a page reload immediately to ensure all state is cleared
      console.log(`[AuthButton ${new Date(timestamp).toISOString()}] Forcing page reload for OAuth sign-out`);
      
      // Use a very short timeout to allow logs to be sent
      setTimeout(() => {
        // Redirect to home with refresh parameter to ensure middleware clears cookies
        window.location.href = `/?refresh=true&timestamp=${timestamp}`;
      }, 100);
      
      // We'll still call the server action, but we won't wait for it
      console.log(`[AuthButton ${new Date(timestamp).toISOString()}] Calling server-side signOutAction`);
      startTransition(() => {
        signOutAction();
      });
      
      // No need for fallback timeout since we're forcing navigation immediately
    } catch (err) {
      console.error('[SimpleAuthButton] Error during sign out:', err);
      
      // Even on error, force a sign-out by reloading the page
      window.location.href = `/?refresh=true&timestamp=${Date.now()}`;
    }
  };

  // If we're in recovery mode, show a cancel button
  if (isRecoverySession) {
    return (
      <Button 
        onClick={handleCancelRecovery}
        variant="outline"
        className="text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/10 hover:text-yellow-300 hover:border-yellow-400/40 transition-all"
      >
        Cancel Reset
      </Button>
    );
  }

  if (loading) {
    return (
      <Button 
        disabled
        className="bg-gradient-to-r from-blue-600/50 to-purple-600/50 text-white border-none px-5 sm:px-6 py-2.5 sm:py-3 h-auto rounded-lg"
      >
        Loading...
      </Button>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <p className="text-sm text-white font-medium">
          Welcome, <span className="bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">{user.user_metadata?.name ? user.user_metadata.name.split(' ')[0] : user.email?.split('@')[0] || 'User'}</span>
        </p>
        <Button 
          onClick={handleSignOut} 
          disabled={isPending}
          variant="outline"
          className="text-white border-white/20 hover:bg-white/10 hover:text-white hover:border-white/40 transition-all"
        >
          {isPending ? 'Signing out...' : 'Sign out'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button 
        onClick={() => router.push('/auth/login')}
        variant="outline"
        className="text-white border-white/20 hover:bg-white/10 hover:text-white hover:border-white/40 transition-all"
      >
        Sign in
      </Button>
      <Button 
        onClick={() => router.push('/auth/signup')}
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-none px-5 sm:px-6 py-2.5 sm:py-3 h-auto rounded-lg"
      >
        Sign up
      </Button>
    </div>
  );
} 