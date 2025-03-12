'use client';

import { useState, useTransition, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Mail, Lock, User as UserIcon, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signUpAction, getOAuthSignInAction, updateExistingUserPasswordAction } from '@/utils/supabase/actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Create a separate component that uses useSearchParams
function SignupForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/dashboard';
  
  // User exists dialog state
  const [showUserExistsDialog, setShowUserExistsDialog] = useState(false);
  const [existingUserEmail, setExistingUserEmail] = useState('');
  const [existingUserName, setExistingUserName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [dialogSuccess, setDialogSuccess] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  
  // Check for error or success messages from URL
  const errorMessage = searchParams.get('error');
  const successMessage = searchParams.get('success');
  const userExists = searchParams.get('userExists');
  const existingEmail = searchParams.get('email');
  const existingName = searchParams.get('name');

  // Log all search params for debugging
  useEffect(() => {
    console.log('Search params on load:', {
      userExists: searchParams.get('userExists'),
      email: searchParams.get('email'),
      name: searchParams.get('name'),
      error: searchParams.get('error'),
      success: searchParams.get('success')
    });
  }, [searchParams]);

  // Use error or success from URL if available
  useEffect(() => {
    if (errorMessage) {
      setError(errorMessage);
    }
    if (successMessage) {
      setSuccess(true);
    }
    
    // Check if we should show the user exists dialog
    if (userExists === 'true' && existingEmail) {
      console.log('User exists dialog should show:', {
        userExists,
        existingEmail,
        existingName
      });
      
      setExistingUserEmail(existingEmail);
      setExistingUserName(existingName || existingEmail.split('@')[0]);
      setShowUserExistsDialog(true);
      
      // Pre-fill the email field
      setEmail(existingEmail);
      
      // Clear the error message if it exists
      if (errorMessage) {
        // Use router.replace to remove the error from the URL
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('error');
        router.replace(`/auth/signup?${newParams.toString()}`);
      }
    }
  }, [errorMessage, successMessage, userExists, existingEmail, existingName, router, searchParams]);

  // Log dialog state changes
  useEffect(() => {
    console.log('Dialog state changed:', {
      showUserExistsDialog,
      existingUserEmail,
      existingUserName
    });
  }, [showUserExistsDialog, existingUserEmail, existingUserName]);

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
  
  const handleUpdatePassword = async () => {
    setDialogError(null);
    setDialogSuccess(null);
    setIsUpdatingPassword(true);
    
    if (newPassword.length < 8) {
      setDialogError('Password must be at least 8 characters long');
      setIsUpdatingPassword(false);
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setDialogError('Passwords do not match');
      setIsUpdatingPassword(false);
      return;
    }
    
    try {
      // Create a FormData object to pass to the server action
      const formData = new FormData();
      formData.append('email', existingUserEmail);
      formData.append('password', newPassword);
      
      // Call the server action
      await updateExistingUserPasswordAction(formData);
      
      // If we get here, the action was successful
      setDialogSuccess('Check your email for a password reset link');
      
      // Close the dialog after a delay
      setTimeout(() => {
        setShowUserExistsDialog(false);
        router.push('/auth/login');
      }, 3000);
      
    } catch (err) {
      setDialogError('An unexpected error occurred');
      console.error('Error updating password:', err);
    } finally {
      setIsUpdatingPassword(false);
    }
  };
  
  const handleCancelUserExists = () => {
    setShowUserExistsDialog(false);
    // Clear the URL parameters
    router.replace('/auth/signup');
  };

  if (success) {
    return (
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
    );
  }

  return (
    <>
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
          
          <p className="text-xs text-gray-500 text-center mt-1">
            If you see a 'oibpypueiknfqnljgqjr.supabase.co' that is Lifeguide. Waiting Google approval for correct branding.
          </p>
          
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

      {/* User Exists Dialog */}
      <Dialog open={showUserExistsDialog} onOpenChange={setShowUserExistsDialog}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">Account Already Exists</DialogTitle>
            <DialogDescription className="text-gray-400">
              We found an existing account with this email address.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="border border-gray-700 p-4 rounded-md bg-gray-800/50">
              <p className="font-medium text-gray-300">Account Details</p>
              <p className="text-gray-400">Email: {existingUserEmail}</p>
              {existingUserName && <p className="text-gray-400">Name: {existingUserName}</p>}
            </div>
            
            <div className="text-center">
              <Link 
                href="/auth/forgot-password" 
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                onClick={() => setShowUserExistsDialog(false)}
              >
                Forgot your password? Reset it here
              </Link>
            </div>
            
            {dialogError && (
              <div className="bg-red-900/30 border border-red-800 p-3 rounded-md flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-400">{dialogError}</p>
              </div>
            )}
            
            {dialogSuccess && (
              <div className="bg-green-900/30 border border-green-800 p-3 rounded-md flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-green-400">{dialogSuccess}</p>
              </div>
            )}
            
            {!dialogSuccess && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-gray-300">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                    disabled={isUpdatingPassword}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-gray-300">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                    disabled={isUpdatingPassword}
                  />
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={handleCancelUserExists} 
              disabled={isUpdatingPassword}
              className="border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              {isUpdatingPassword ? 'Please wait...' : 'This is not my account'}
            </Button>
            
            {!dialogSuccess && (
              <Button 
                onClick={handleUpdatePassword} 
                disabled={isUpdatingPassword}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-none"
              >
                {isUpdatingPassword ? 'Processing...' : 'Yes, update my password'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Main component with Suspense boundary
export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 px-4 py-8">
      <Suspense fallback={
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2 mx-auto"></div>
          </div>
          <div className="mt-8 space-y-6 bg-gray-800/50 p-8 rounded-xl border border-gray-700 shadow-xl">
            <div className="h-12 bg-gray-700 rounded animate-pulse"></div>
            <div className="space-y-4">
              <div className="h-10 bg-gray-700 rounded animate-pulse"></div>
              <div className="h-10 bg-gray-700 rounded animate-pulse"></div>
              <div className="h-10 bg-gray-700 rounded animate-pulse"></div>
              <div className="h-12 bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      }>
        <SignupForm />
      </Suspense>
    </div>
  );
} 