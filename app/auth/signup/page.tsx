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

// Define types for action results
type SignUpActionResult = {
  userExists?: boolean;
  error?: string;
};

type UpdatePasswordActionResult = {
  success?: boolean;
  error?: string;
};

// Create a separate component that uses useSearchParams
function SignupForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userExistsDialog, setUserExistsDialog] = useState(false);
  const [existingUserEmail, setExistingUserEmail] = useState('');
  const [existingUserPassword, setExistingUserPassword] = useState('');
  const [showExistingPassword, setShowExistingPassword] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/dashboard';
  
  // Check for error or success messages from URL
  const errorMessage = searchParams.get('error');
  const successMessage = searchParams.get('success');

  // Use error from URL if available
  useEffect(() => {
    if (errorMessage) {
      setError(errorMessage);
    }
  }, [errorMessage]);

  // Password strength indicators
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  
  const passwordStrength = [
    hasMinLength,
    hasUpperCase,
    hasLowerCase,
    hasNumber,
    hasSpecialChar
  ].filter(Boolean).length;
  
  const getPasswordStrengthText = () => {
    if (password.length === 0) return '';
    if (passwordStrength <= 2) return 'Weak';
    if (passwordStrength <= 4) return 'Good';
    return 'Strong';
  };
  
  const getPasswordStrengthColor = () => {
    if (password.length === 0) return 'bg-gray-700';
    if (passwordStrength <= 2) return 'bg-red-500';
    if (passwordStrength <= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Password validation
  const passwordsMatch = password === confirmPassword;
  const isPasswordValid = 
    hasMinLength && 
    hasUpperCase && 
    hasLowerCase && 
    hasNumber && 
    hasSpecialChar;
  
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !password || !confirmPassword) {
      setError('All fields are required');
      return;
    }
    
    if (!isPasswordValid) {
      setError('Password does not meet all requirements');
      return;
    }
    
    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('redirectTo', returnTo);
    
    startTransition(async () => {
      const result = await signUpAction(formData) as unknown as SignUpActionResult;
      
      if (result?.userExists) {
        setExistingUserEmail(email);
        setUserExistsDialog(true);
      }
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
    if (!existingUserEmail || !existingUserPassword) {
      setError('Email and password are required');
      return;
    }
    
    const formData = new FormData();
    formData.append('email', existingUserEmail);
    formData.append('password', existingUserPassword);
    formData.append('redirectTo', returnTo);
    
    startTransition(async () => {
      const result = await updateExistingUserPasswordAction(formData) as unknown as UpdatePasswordActionResult;
      
      if (result?.success) {
        setPasswordUpdated(true);
      } else if (result?.error) {
        setError(result.error);
      }
    });
  };
  
  const handleCancelUserExists = () => {
    setUserExistsDialog(false);
    setExistingUserPassword('');
    setError(null);
  };

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
          Create Your Account
        </h1>
        <p className="mt-2 text-gray-400">
          Join LifeGuide and start building your personal life blueprint
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
            <Label htmlFor="name" className="text-gray-300">Full Name</Label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
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
          
          <div className="space-y-2">
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
            
            {/* Password strength meter */}
            {password.length > 0 && (
              <div className="space-y-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Password strength:</span>
                  <span className={`text-xs ${
                    passwordStrength <= 2 ? 'text-red-400' : 
                    passwordStrength <= 4 ? 'text-yellow-400' : 
                    'text-green-400'
                  }`}>
                    {getPasswordStrengthText()}
                  </span>
                </div>
                <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getPasswordStrengthColor()} transition-all duration-300`} 
                    style={{ width: `${(passwordStrength / 5) * 100}%` }}
                  ></div>
                </div>
                
                <ul className="space-y-1 mt-2">
                  <li className="text-xs flex items-center gap-1">
                    <span className={hasMinLength ? 'text-green-400' : 'text-gray-500'}>
                      {hasMinLength ? <CheckCircle className="h-3 w-3" /> : '•'}
                    </span>
                    <span className={hasMinLength ? 'text-green-400' : 'text-gray-400'}>
                      At least 8 characters
                    </span>
                  </li>
                  <li className="text-xs flex items-center gap-1">
                    <span className={hasUpperCase ? 'text-green-400' : 'text-gray-500'}>
                      {hasUpperCase ? <CheckCircle className="h-3 w-3" /> : '•'}
                    </span>
                    <span className={hasUpperCase ? 'text-green-400' : 'text-gray-400'}>
                      At least one uppercase letter
                    </span>
                  </li>
                  <li className="text-xs flex items-center gap-1">
                    <span className={hasLowerCase ? 'text-green-400' : 'text-gray-500'}>
                      {hasLowerCase ? <CheckCircle className="h-3 w-3" /> : '•'}
                    </span>
                    <span className={hasLowerCase ? 'text-green-400' : 'text-gray-400'}>
                      At least one lowercase letter
                    </span>
                  </li>
                  <li className="text-xs flex items-center gap-1">
                    <span className={hasNumber ? 'text-green-400' : 'text-gray-500'}>
                      {hasNumber ? <CheckCircle className="h-3 w-3" /> : '•'}
                    </span>
                    <span className={hasNumber ? 'text-green-400' : 'text-gray-400'}>
                      At least one number
                    </span>
                  </li>
                  <li className="text-xs flex items-center gap-1">
                    <span className={hasSpecialChar ? 'text-green-400' : 'text-gray-500'}>
                      {hasSpecialChar ? <CheckCircle className="h-3 w-3" /> : '•'}
                    </span>
                    <span className={hasSpecialChar ? 'text-green-400' : 'text-gray-400'}>
                      At least one special character
                    </span>
                  </li>
                </ul>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-gray-300">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400 ${
                  confirmPassword && !passwordsMatch ? 'border-red-500' : ''
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 h-4 w-4 text-gray-500 focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
            )}
          </div>
          
          {(error || successMessage) && (
            <div className={`${error ? 'bg-red-900/30 border-red-800' : 'bg-green-900/30 border-green-800'} border p-3 rounded-md flex items-start gap-2`}>
              {error && <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />}
              <p className={`text-sm ${error ? 'text-red-400' : 'text-green-400'}`}>
                {error || successMessage}
              </p>
            </div>
          )}
          
          <Button 
            type="submit" 
            disabled={isPending}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-none h-12"
          >
            {isPending ? 'Processing...' : 'Create Account'}
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
      
      {/* User exists dialog */}
      <Dialog open={userExistsDialog} onOpenChange={setUserExistsDialog}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Account Already Exists</DialogTitle>
            <DialogDescription className="text-gray-400">
              {passwordUpdated 
                ? 'Your password has been updated successfully. You can now sign in with your new password.'
                : 'An account with this email already exists. You can update your password if you forgot it.'}
            </DialogDescription>
          </DialogHeader>
          
          {!passwordUpdated ? (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="existingPassword" className="text-gray-300">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                    <Input
                      id="existingPassword"
                      type={showExistingPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={existingUserPassword}
                      onChange={(e) => setExistingUserPassword(e.target.value)}
                      className="pl-10 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowExistingPassword(!showExistingPassword)}
                      className="absolute right-3 top-3 h-4 w-4 text-gray-500 focus:outline-none"
                    >
                      {showExistingPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                {error && (
                  <div className="bg-red-900/30 border border-red-800 p-3 rounded-md flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={handleCancelUserExists}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdatePassword}
                  disabled={isPending || !existingUserPassword}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-none"
                >
                  {isPending ? 'Processing...' : 'Update Password'}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <DialogFooter>
              <Button 
                onClick={() => router.push('/auth/login')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-none"
              >
                Sign In
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
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