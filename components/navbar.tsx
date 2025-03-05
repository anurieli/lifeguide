'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import SimpleAuthButton from '@/components/SimpleAuthButton';
import type { User, Session } from '@supabase/supabase-js';
import { useAuth } from '@/utils/AuthProvider';

export default function Navbar() {
  const pathname = usePathname();
  const { user, loading } = useAuth(); // Use the AuthProvider context
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Only check admin status if we have a user
    if (!user) {
      setIsAdmin(false);
      return;
    }
    
    const checkAdminStatus = async () => {
      const supabase = createClient();
      console.log('[Navbar] Checking admin status for user:', user.email);
      
      if (!user.email) {
        setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', user.email)
        .single();
      
      if (error) {
        console.error('[Navbar] Error checking admin status:', error);
        setIsAdmin(false);
        return;
      }
      
      console.log('[Navbar] Admin status check result:', !!data);
      setIsAdmin(!!data);
    };

    checkAdminStatus();
  }, [user]); // Re-run when user changes

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-lg border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex flex-col items-start">
            <Link href="/" className="text-white font-bold text-xl">
              LifeGuide
            </Link>
            <p className="text-gray-400 text-xs italic">Know who you are & where you're going</p>
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
            
            {/* Dashboard is only visible when logged in */}
            {user && (
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
            )}

            {/* Admin is only visible for admin users */}
            {isAdmin && user && (
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
            )}

            {/* Coming Soon link */}
            <Link
              href="/coming-soon"
              className={`text-sm ${
                pathname === '/coming-soon'
                  ? 'text-white font-medium'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Coming Soon
            </Link>

            {/* Auth button on the far right */}
            <SimpleAuthButton />
          </div>
        </div>
      </div>
    </nav>
  );
}  