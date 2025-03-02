'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertCircle, Mail, Lock, User as UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';

export default function AuthButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();
  const { user: authUser, signOut } = useAuth();
  const supabase = createClient();



  useEffect(() => {
    console.log('AuthButton mounted, user:', authUser ? 'Logged in' : 'Not logged in');
  }, [authUser]);

  useEffect(() => {
    // Check current auth state
    const initializeAuth = async () => {
      try {
        console.log('AuthButton: Checking session...');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('AuthButton: Session retrieved', !!session);
      } catch (err) {
        console.error('AuthButton: Error checking session', err);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session ? 'User session exists' : 'No user session');
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('User signed in or token refreshed, refreshing router');
        router.refresh();
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out, refreshing router');
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase.auth]);

  const handleSignOut = async () => {
    const timestamp = new Date().toISOString();
    console.log(`[AuthButton ${timestamp}] Sign-out initiated`);
    
    try {
      // Log cookies before sign-out
      console.log(`[AuthButton ${timestamp}] Cookies before sign-out:`, document.cookie);
      
      setLoading(true);
      console.log(`[AuthButton ${timestamp}] Calling supabase.auth.signOut()`);
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      
      if (error) {
        console.error(`[AuthButton ${timestamp}] Error during sign-out:`, error);
        console.error(`[AuthButton ${timestamp}] Error details:`, {
          message: error.message,
          status: error.status
        });
        setError('Error signing out. Please try again.');
      } else {
        console.log(`[AuthButton ${timestamp}] Sign-out successful`);
        
        // Log cookies after sign-out
        console.log(`[AuthButton ${timestamp}] Cookies after sign-out:`, document.cookie);
        
        // Manually check if auth cookies still exist
        const hasSBCookies = document.cookie.includes('sb-');
        console.log(`[AuthButton ${timestamp}] Auth cookies still present:`, hasSBCookies);
        
        // Force refresh the page to ensure clean state
        console.log(`[AuthButton ${timestamp}] Forcing page refresh for clean state`);
        window.location.href = '/';
      }
    } catch (err) {
      console.error(`[AuthButton ${timestamp}] Unexpected error during sign-out:`, err);
      if (err instanceof Error) {
        console.error(`[AuthButton ${timestamp}] Error details:`, {
          message: err.message,
          stack: err.stack
        });
      }
      setError('Unexpected error during sign-out');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignin = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const timestamp = new Date().toISOString();
    console.log(`[AuthButton ${timestamp}] Google sign-in initiated`);
    
    try {
      setLoading(true);
      setError(null);
      
      // Check if we already have auth cookies - might indicate a broken auth state
      if (typeof document !== 'undefined') {
        console.log(`[AuthButton ${timestamp}] Cookies before Google sign-in:`, document.cookie);
        
        const hasSupabaseCookies = document.cookie.includes('sb-');
        const hasMockUserCookie = document.cookie.includes('mock_user');
        
        console.log(`[AuthButton ${timestamp}] Existing auth state check:`, {
          hasSupabaseCookies,
          hasMockUserCookie
        });
        
        if (hasMockUserCookie) {
          console.log(`[AuthButton ${timestamp}] Found mock_user cookie, clearing it before sign-in`);
          document.cookie = 'mock_user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        }
        
        // If we already have Supabase cookies but no user, try refreshing the session first
        if (hasSupabaseCookies) {
          console.log(`[AuthButton ${timestamp}] Found Supabase cookies, checking session state`);
          const { data: { session } } = await supabase.auth.getSession();
          
          console.log(`[AuthButton ${timestamp}] Current session status:`, {
            hasSession: !!session,
            expires: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'none'
          });
          
          if (!session) {
            console.log(`[AuthButton ${timestamp}] Found cookies but no session, attempting refresh`);
            const { error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              console.log(`[AuthButton ${timestamp}] Session refresh failed, clearing cookies before new sign-in`);
              await supabase.auth.signOut({ scope: 'local' });
            } else {
              console.log(`[AuthButton ${timestamp}] Session refreshed successfully, redirecting to dashboard`);
              window.location.href = '/dashboard';
              return;
            }
          }
        }
      }
      
      const returnPath = '/dashboard';
      console.log(`[AuthButton ${timestamp}] Calling supabase.auth.signInWithOAuth with provider: google, returnTo: ${returnPath}`);
      
      // Set up detailed redirect options
      const redirectUrl = `${window.location.origin}/auth/callback`;
      console.log(`[AuthButton ${timestamp}] Redirect URL configured as: ${redirectUrl}`);
      
      const {data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${redirectUrl}?returnTo=${returnPath}`,
          queryParams: {
            prompt: 'select_account', // Force Google to show account selection
            access_type: 'offline' // Request a refresh token
          }
        }
      });
      
      if (error) {
        console.error(`[AuthButton ${timestamp}] Error during Google sign-in:`, error);
        console.error(`[AuthButton ${timestamp}] Error details:`, {
          message: error.message,
          status: error.status,
          stack: error.stack
        });
        setError('Error signing in with Google. Please try again.');
        setLoading(false);
        return;
      }
      
      console.log(`[AuthButton ${timestamp}] OAuth initialization successful, redirecting to provider`);
      if (data?.url) {
        console.log(`[AuthButton ${timestamp}] OAuth URL:`, data.url);
        console.log(`[AuthButton ${timestamp}] Redirecting to Google auth page`);
        // No need to set loading to false as we're redirecting
      } else {
        console.warn(`[AuthButton ${timestamp}] No redirect URL returned from signInWithOAuth!`);
        setError('Error starting Google sign-in flow. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      console.error(`[AuthButton ${timestamp}] Unexpected error during Google sign-in:`, err);
      if (err instanceof Error) {
        console.error(`[AuthButton ${timestamp}] Error details:`, {
          message: err.message,
          stack: err.stack
        });
      }
      setError('Unexpected error during sign-in');
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    
    if (isSignUp && !name) {
      setError('Please enter your name');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      console.log('Starting email sign in for:', email);

      // Try sign in first
      if (!isSignUp) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        // If error indicates user doesn't exist, switch to sign up mode
        if (signInError && (signInError.message.includes('Invalid login credentials') || signInError.message.includes('user not found'))) {
          setIsSignUp(true);
          setError('Account not found. Please sign up with your name.');
        } else if (signInError) {
          // Other sign in error
          console.error('Sign in error:', signInError.message);
          setError(signInError.message);
        } else {
          // Sign in successful
          console.log('Sign in successful');
          setEmail('');
          setPassword('');
          setName('');
          setIsOpen(false);
          router.refresh();
        }
      } else {
        // Sign up with name in user metadata
        console.log('Attempting sign up with name:', name);
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: name
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) {
          console.error('Sign up error:', error.message);
          setError(error.message);
        } else {
          console.log('Sign up successful with name:', name);
          setEmail('');
          setPassword('');
          setName('');
          setIsSignUp(false);
          setIsOpen(false);
          router.refresh();
        }
      }
    } catch (error) {
      console.error('Unexpected error during email auth:', error);
      setError('Error signing in with email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
  };

  if (authUser) {
    return (
      <div className="flex items-center gap-4">
        <p className="text-sm text-white font-medium">
          Welcome, <span className="bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">{authUser.user_metadata?.display_name || authUser.email?.split('@')[0] || 'User'}</span>
        </p>
        <Button 
          onClick={handleSignOut} 
          disabled={signingOut}
          variant="outline"
          className="text-white border-white/20 hover:bg-white/10 hover:text-white hover:border-white/40 transition-all"
        >
          {signingOut ? 'Signing out...' : 'Sign out'}
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)}
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-none px-5 sm:px-6 py-2.5 sm:py-3 h-auto rounded-lg"
      >
        Sign in
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-gray-900 border border-gray-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
              {isSignUp ? 'Create an Account' : 'Welcome Back'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {isSignUp ? 'Sign up to create your personal life blueprint' : 'Sign in to access your personal life blueprint'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Button 
              onClick={handleGoogleSignin} 
              disabled={signingIn}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-none h-12"
            >
              {signingIn ? 'Processing...' : `Sign ${isSignUp ? 'up' : 'in'} with Google`}
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-700"></span>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-gray-900 px-2 text-gray-400">Or continue with email</span>
              </div>
            </div>
            
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-300">Name</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                      required={isSignUp}
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                    required
                  />
                </div>
              </div>
              {error && (
                <div className="bg-red-900/30 border border-red-800 p-3 rounded-md flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
              
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-none h-12"
              >
                {loading ? 'Processing...' : isSignUp ? 'Sign up' : 'Sign in'}
              </Button>
              
              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
                </button>
              </div>
            </form>
          </div>
          
          <p className="text-center text-xs text-gray-500 mt-4">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
} 