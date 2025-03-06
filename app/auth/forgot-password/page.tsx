'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { forgotPasswordAction } from '@/utils/supabase/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, AlertCircle, CheckCircle2, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  
  // Get error or success message from URL if available
  const errorMessage = searchParams.get('error');
  const successMessage = searchParams.get('success');
  
  useEffect(() => {
    // Check and update cooldown timer
    const checkCooldown = () => {
      const lastAttempt = localStorage.getItem('passwordResetLastAttempt');
      if (lastAttempt) {
        const timeSinceLastAttempt = Date.now() - parseInt(lastAttempt);
        const cooldownPeriod = 120000; // 2 minutes
        if (timeSinceLastAttempt < cooldownPeriod) {
          setTimeLeft(Math.ceil((cooldownPeriod - timeSinceLastAttempt) / 1000));
        } else {
          setTimeLeft(0);
        }
      }
    };

    // Check immediately
    checkCooldown();

    // Update every second
    const interval = setInterval(checkCooldown, 1000);

    return () => clearInterval(interval);
  }, []);
  
  // Use error or success from URL if available
  if (errorMessage && !error) {
    setError(errorMessage);
  }
  
  if (successMessage && !success) {
    setSuccess(true);
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!email) {
      setError('Email is required');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Check the last attempt time from localStorage
    const lastAttempt = localStorage.getItem('passwordResetLastAttempt');
    if (lastAttempt) {
      const timeSinceLastAttempt = Date.now() - parseInt(lastAttempt);
      if (timeSinceLastAttempt < 120000) { // 2 minutes
        setError(`Please wait ${Math.ceil((120000 - timeSinceLastAttempt) / 1000)} seconds before trying again`);
        return;
      }
    }
    
    startTransition(async () => {
      try {
        // Store the current attempt time
        localStorage.setItem('passwordResetLastAttempt', Date.now().toString());
        
        const formData = new FormData();
        formData.append('email', email);
        await forgotPasswordAction(formData);
      } catch (err) {
        console.error('Error during password reset request:', err);
        setError('An unexpected error occurred. Please try again.');
      }
    });
  };
  
  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 px-4 py-8">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="bg-gray-800/50 p-8 rounded-xl border border-gray-700 shadow-xl">
            <h1 className="text-2xl font-bold text-white mb-4">Check your email</h1>
            <p className="text-gray-300 mb-6">
              {successMessage || "We've sent you a password reset link. Please check your inbox and follow the instructions to reset your password."}
            </p>
            <div className="space-y-4">
              {timeLeft > 0 ? (
                <p className="text-sm text-gray-400">
                  You can request another email in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </p>
              ) : (
                <Button 
                  onClick={() => setSuccess(false)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-none"
                >
                  Didn't get the email? Try again
                </Button>
              )}
              <Button 
                onClick={() => router.push('/auth/login')}
                variant="outline"
                className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Return to Sign In
              </Button>
            </div>
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
            Reset Password
          </h1>
          <p className="mt-2 text-gray-400">
            Enter your email to receive a password reset link
          </p>
        </div>

        <div className="mt-8 space-y-6 bg-gray-800/50 p-8 rounded-xl border border-gray-700 shadow-xl">
          <div className="flex items-center mb-4">
            <Button 
              variant="ghost" 
              className="p-0 mr-2 text-gray-400 hover:text-white hover:bg-transparent" 
              onClick={() => router.push('/auth/login')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          
          {error && (
            <div className="bg-red-900/30 border border-red-800 p-3 rounded-md flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                  disabled={isPending}
                />
              </div>
            </div>
            
            <Button
              type="submit"
              disabled={isPending || timeLeft > 0}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-none h-12"
            >
              {isPending ? 'Sending...' : timeLeft > 0 ? `Wait ${timeLeft}s` : 'Send Reset Link'}
            </Button>
          </form>
          
          <div className="text-center text-sm">
            <p className="text-gray-400">
              Remember your password?{' '}
              <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 