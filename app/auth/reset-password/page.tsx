'use client';

import { useState, useTransition, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { resetPasswordAction } from '@/utils/supabase/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, AlertCircle, CheckCircle2, EyeIcon, EyeOffIcon } from 'lucide-react';

// Create a separate component that uses useSearchParams
function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Get error or success message from URL if available
  const errorMessage = searchParams.get('error');
  const successMessage = searchParams.get('success');
  
  // Use error or success from URL if available
  useEffect(() => {
    if (errorMessage && !error) {
      setError(errorMessage);
    }
    
    if (successMessage && !success) {
      setSuccess(true);
    }
  }, [errorMessage, successMessage, error, success]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!password || !confirmPassword) {
      setError('Password and confirm password are required');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('password', password);
        formData.append('confirmPassword', confirmPassword);
        await resetPasswordAction(formData);
      } catch (err) {
        console.error('Error during password reset:', err);
        setError('An unexpected error occurred. Please try again.');
      }
    });
  };
  
  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };
  
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center mb-2">
          <Button 
            variant="ghost" 
            className="p-0 mr-2" 
            onClick={() => router.push('/auth/login')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-xl font-bold">Set New Password</CardTitle>
        </div>
        <CardDescription>
          Enter your new password below.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success ? (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              {successMessage || "Password updated successfully. You can now sign in with your new password."}
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full pr-10"
                  disabled={isPending}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={toggleShowPassword}
                >
                  {showPassword ? (
                    <EyeOffIcon className="h-4 w-4 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Password must be at least 8 characters long
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="block w-full"
                disabled={isPending}
              />
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={isPending}
            >
              {isPending ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-center border-t p-4">
        <div className="text-sm text-gray-600">
          {success ? (
            <Link href="/auth/login" className="font-medium text-primary hover:underline">
              Go to Sign In
            </Link>
          ) : (
            <span>
              Remember your password?{' '}
              <Link href="/auth/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </span>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

// Main component with Suspense boundary
export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <Suspense fallback={
        <Card className="w-full max-w-md animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
          <CardFooter className="border-t p-4">
            <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto"></div>
          </CardFooter>
        </Card>
      }>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
} 