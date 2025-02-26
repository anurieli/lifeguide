'use client';

import { AuthButton } from '@/components/AuthButton';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text mb-4">
          Welcome to Life Guide
        </h1>
        <p className="text-gray-400 max-w-md mx-auto">
          Sign in to start building your personal life blueprint and unlock your full potential.
        </p>
      </div>
      <AuthButton />
    </div>
  );
} 