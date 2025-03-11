'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function MobileEditorNotice() {
  const router = useRouter();
  
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-start pt-4 p-3 text-center">
      <div className="max-w-md w-full space-y-3 bg-gray-800/50 backdrop-blur-sm p-5 rounded-xl border border-white/10 shadow-xl">
        <div className="flex justify-center">
          <div className="relative w-16 h-16">
            <Image 
              src="/lifeguide.svg" 
              alt="LifeGuide Logo" 
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
        
        <h1 className="text-lg font-bold text-white">Desktop Experience Required</h1>
        
        <div className="space-y-2 text-gray-300 text-sm">
          <p>
            Editing your Guide is currently only supported on Desktop.
          </p>
          
          <div className="bg-blue-900/30 border border-blue-700/30 rounded-lg p-2 text-xs text-blue-300">
            <p className="font-medium mb-1">There's a reason for it:</p>
            <p>We want you to be intentional with your life blueprint. Creating a thoughtful guide works best when you are stationary.</p>
          </div>
          
          <p>
            Don't worry! You can always view your guide on mobile in the dashboard.
          </p>
        </div>
        
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full mt-2 py-2 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
} 