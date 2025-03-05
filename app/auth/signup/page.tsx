'use client';

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Mail, Lock, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signUpAction, getOAuthSignInAction } from '@/utils/supabase/actions';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/dashboard';
  
  // Check for error or success messages from URL
  const errorMessage = searchParams.get('error');
  const successMessage = searchParams.get('success');

  // Use error or success from URL if available
  useEffect(() => {
    if (errorMessage) {
      setError(errorMessage);
    }
    if (successMessage) {
      setSuccess(true);
    }
  }, [errorMessage, successMessage]);

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    
    if (!name) {
      setError('Please enter your name');
      return;
    }
    
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('name', name);
    formData.append('redirectTo', returnTo);
    
    startTransition(() => {
      signUpAction(formData);
    });
  };

  const handleGoogleSignin = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    
    try {
      startTransition(async () => {
        const url = await getOAuthSignInAction('google', returnTo);
        if (url) {
          window.location.href = url;
        } else {
          setError('Failed to initialize Google sign-in');
        }
      });
    } catch (err) {
      console.error('Error during Google sign-in:', err);
      setError('Error signing in with Google. Please try again.');
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 px-4 py-8">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="bg-gray-800/50 p-8 rounded-xl border border-gray-700 shadow-xl">
            <h1 className="text-2xl font-bold text-white mb-4">Check your email</h1>
            <p className="text-gray-300 mb-6">
              {successMessage || "We've sent you a confirmation email. Please check your inbox and follow the instructions to complete your registration."}
            </p>
            <Button 
              onClick={() => router.push('/')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-none"
            >
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
            Create an Account
          </h1>
          <p className="mt-2 text-gray-400">
            Sign up to create your personal life blueprint
          </p>
        </div>

        <div className="mt-8 space-y-6 bg-gray-800/50 p-8 rounded-xl border border-gray-700 shadow-xl">
          <Button 
            onClick={handleGoogleSignin} 
            disabled={isPending}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-none h-12"
          >
            {isPending ? 'Processing...' : 'Sign up with Google'}
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-700"></span>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-gray-800 px-2 text-gray-400">Or continue with email</span>
            </div>
          </div>
          
          <form onSubmit={handleEmailSignUp} className="space-y-4">
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
                  required
                />
              </div>
            </div>
            
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
            
            <div className="space-y-2 relative">
              <Label htmlFor="password" className="text-gray-300">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 h-4 w-4 text-gray-500 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
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
              disabled={isPending}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-none h-12"
            >
              {isPending ? 'Processing...' : 'Sign up'}
            </Button>
            
            <div className="text-center text-sm">
              <p className="text-gray-400">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
        
        <p className="text-center text-xs text-gray-500 mt-4">
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
} 