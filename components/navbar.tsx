'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { AuthButton } from '@/components/AuthButton';
import type { User } from '@supabase/supabase-js';

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const checkAdminStatus = async (email: string | undefined) => {
      if (!email) {
        setIsAdmin(false);
        return;
      }

      const { data } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', email)
        .single();
      
      setIsAdmin(!!data);
    };

    // Check current auth state
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      await checkAdminStatus(session?.user?.email);
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      await checkAdminStatus(session?.user?.email);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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

            {/* Auth button on the far right */}
            <AuthButton />
          </div>
        </div>
      </div>
    </nav>
  );
}  