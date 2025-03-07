'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import SimpleAuthButton from '@/components/SimpleAuthButton';
import type { User, Session } from '@supabase/supabase-js';
import { useAuth } from '@/utils/AuthProvider';
import { Menu, X, Home, BookOpen, Sparkles, UserIcon, Settings } from 'lucide-react';

// Shared admin status check logic
function useAdminStatus() {
  const { user, isRecoverySession } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Only check admin status if we have a user and not in recovery mode
    if (!user || isRecoverySession) {
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
  }, [user, isRecoverySession]);

  return { isAdmin, user, isRecoverySession };
}

// Desktop Navbar Component
function DesktopNavbar() {
  const pathname = usePathname();
  const { isAdmin, user, isRecoverySession } = useAdminStatus();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-lg border-b border-white/10 hidden md:block">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and tagline in a column layout */}
          <div className="flex flex-col items-start">
            <Link href="/" className="text-white font-bold text-xl">
              <img src="/lifeguide.svg" alt="LifeGuide Logo" className="h-8 w-auto" />
            </Link>
            <p className="text-gray-400 text-xs italic whitespace-nowrap">Know who you are & where you're going</p>
          </div>

          {/* Desktop navigation links */}
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
            
            {/* Dashboard is only visible when logged in and NOT in recovery session */}
            {user && !isRecoverySession && (
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

            {/* Admin is only visible for admin users and NOT in recovery session */}
            {isAdmin && user && !isRecoverySession && (
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

            {/* Show a special message during recovery mode */}
            {isRecoverySession && (
              <span className="text-yellow-400 text-sm">
                Password Reset Mode
              </span>
            )}

            {/* Auth button */}
            <SimpleAuthButton />
          </div>
        </div>
      </div>
    </nav>
  );
}

// Mobile Navbar Component
function MobileNavbar() {
  const pathname = usePathname();
  const { isAdmin, user, isRecoverySession } = useAdminStatus();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(true);

  return (
    <>
      {/* Mobile top navbar - only logo, tagline and auth button */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-lg border-b border-white/10 md:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and tagline in a column layout */}
            <div className="flex flex-col items-start">
              <Link href="/" className="text-white font-bold text-xl">
                <img src="/lifeguide.svg" alt="LifeGuide Logo" className="h-8 w-auto" />
              </Link>
              <p className="text-gray-400 text-xs italic whitespace-nowrap">Know who you are & where you're going</p>
            </div>

            {/* Auth button only */}
            <div className="flex items-center">
              <SimpleAuthButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile bottom navigation menu - Instagram-style */}
      <div className={`fixed inset-x-0 bottom-0 z-50 bg-gray-900/90 backdrop-blur-md border-t border-gray-800 md:hidden transition-transform duration-300 ${mobileMenuOpen ? 'translate-y-0' : 'translate-y-full'}`}>
        {/* Tab-style toggle at the top of the navbar */}
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2">
          <button 
            className="flex items-center justify-center w-16 h-10 bg-gray-900/90 backdrop-blur-md border-t border-l border-r border-gray-800 rounded-t-lg"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Hide navigation menu" : "Show navigation menu"}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5 text-gray-400" />
            ) : (
              <Menu className="h-5 w-5 text-gray-400" />
            )}
          </button>
        </div>

        <div className="flex justify-around items-center py-3">
          <Link
            href="/"
            className={`flex flex-col items-center px-3 py-2 ${
              pathname === '/'
                ? 'text-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Home className="h-6 w-6" />
            <span className="text-xs mt-1">Home</span>
          </Link>
          
          <Link
            href="/guide"
            className={`flex flex-col items-center px-3 py-2 ${
              pathname === '/guide'
                ? 'text-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <BookOpen className="h-6 w-6" />
            <span className="text-xs mt-1">Guide</span>
          </Link>
          
          <Link
            href="/coming-soon"
            className={`flex flex-col items-center px-3 py-2 ${
              pathname === '/coming-soon'
                ? 'text-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles className="h-6 w-6" />
            <span className="text-xs mt-1">Coming Soon</span>
          </Link>
          
          {user && !isRecoverySession && (
            <Link
              href="/dashboard"
              className={`flex flex-col items-center px-3 py-2 ${
                pathname === '/dashboard'
                  ? 'text-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <UserIcon className="h-6 w-6" />
              <span className="text-xs mt-1">Dashboard</span>
            </Link>
          )}
          
          {/* Admin link removed from mobile view as requested */}
        </div>
      </div>
    </>
  );
}

// Main Navbar Component that renders the appropriate version
export default function Navbar() {
  return (
    <>
      <DesktopNavbar />
      <MobileNavbar />
    </>
  );
}  