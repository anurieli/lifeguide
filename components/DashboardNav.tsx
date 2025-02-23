'use client';

import Link from 'next/link';
import { User } from '@supabase/supabase-js';

interface DashboardNavProps {
  user: User;
}

export default function DashboardNav({ user }: DashboardNavProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/dashboard" className="flex items-center">
              <span className="text-xl font-bold text-white hover:text-blue-400 transition-colors">
                Dashboard
              </span>
            </Link>
          </div>

          <nav className="flex items-center space-x-4">
            <span className="text-sm text-gray-400">
              {user.email}
            </span>
            <Link
              href="/dashboard/blueprint"
              className="text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-2 rounded-md transition-colors"
            >
              Blueprint
            </Link>
            <Link
              href="/dashboard/settings"
              className="text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-2 rounded-md transition-colors"
            >
              Settings
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-2 rounded-md transition-colors"
              >
                Sign Out
              </button>
            </form>
          </nav>
        </div>
      </div>
    </header>
  );
} 