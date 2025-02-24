'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

// Mock user for development
const MOCK_USER = {
  id: 'b4b92493-74d6-4a14-a73b-7107eb0eab84',
  email: 'anurieli365@gmail.com',
  role: 'admin'
};

export default function Navbar() {
  const pathname = usePathname();
  // Always use the mock user instead of real auth
  const user = MOCK_USER;
  const loading = false;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-lg border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-white font-bold text-xl">
              LifeGuide
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {/* The Guide is always accessible */}
            <Link
              href="/guide"
              className={`text-sm ${
                pathname === '/guide'
                  ? 'text-white font-medium'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              The Guide
            </Link>
            
            {/* Other nav items only show up for the mock user */}
            <>
              <Link
                href="/dashboard"
                className={`text-sm ${
                  pathname === '/dashboard'
                    ? 'text-white font-medium'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/admin"
                className={`text-sm ${
                  pathname === '/admin'
                    ? 'text-white font-medium'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Admin
              </Link>
            </>
          </div>
        </div>
      </div>
    </nav>
  );
}  