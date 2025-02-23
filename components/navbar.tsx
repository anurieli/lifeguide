'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export default function Navbar() {
  const { user, signIn, signOut } = useAuth();
  const router = useRouter();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold text-white hover:text-blue-400 transition-colors">LifeGuide</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              className="text-gray-300 hover:text-white hover:bg-gray-800"
              onClick={() => router.push('/admin')}
            >
              Admin
            </Button>
            {user ? (
              <>
                <Button 
                  variant="ghost" 
                  className="text-gray-300 hover:text-white hover:bg-gray-800"
                  onClick={() => router.push('/dashboard')}
                >
                  Dashboard
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => signOut()}
                  className="text-gray-300 hover:text-white border-gray-700 hover:border-gray-600 hover:bg-gray-800"
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => signIn()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}  