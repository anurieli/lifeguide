'use client';

import { useDashboard } from '@/context/DashboardContext';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Settings, CheckSquare, Edit, ChevronLeft, ChevronRight, HelpCircle, X } from 'lucide-react';
import { cn } from '@/utils/utils';
import { useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";

export function Sidebar() {
  const { isSidebarVisible, toggleSidebar, activeSection, setActiveSection, isMobile } = useDashboard();
  const pathname = usePathname();
  const router = useRouter();
  const [isNewUserDialogOpen, setIsNewUserDialogOpen] = useState(false);
  
  // Hide sidebar completely when in editor mode or on mobile
  if (pathname === '/dashboard/editor' || isMobile) {
    return null;
  }
  
  const isActive = (path: string) => {
    if (path === '/dashboard' && pathname === '/dashboard') return true;
    if (path !== '/dashboard' && pathname.startsWith(path)) return true;
    return false;
  };
  
  return (
    <>
      <div className={cn(
        "bg-gray-900/50 backdrop-blur-sm border-r border-white/10 transition-all duration-300 h-full",
        isSidebarVisible ? 'w-64' : 'w-16'
      )}>
        <div className="flex flex-col h-full">
          <div className="p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <button
                onClick={toggleSidebar}
                className={cn(
                  "flex items-center justify-between px-3 py-2 bg-gray-800/80 rounded-lg hover:bg-gray-700 transition-colors",
                  !isSidebarVisible && "justify-center w-full"
                )}
              >
                <span className="text-gray-400 text-sm">{isSidebarVisible ? '' : ''} </span>
                {isSidebarVisible ? (
                  <ChevronLeft className="h-5 w-5 text-gray-300" />
                ) : (
                  <ChevronRight className="h-6 w-6 text-gray-200" />
                )}
              </button>
            </div>
            
            {isSidebarVisible && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsNewUserDialogOpen(true)}
                  className="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/40 transition-colors text-sm flex items-center gap-1.5"
                >
                  <HelpCircle className="h-4 w-4" />
                  New User?
                </button>
                <button
                  onClick={() => router.push('/dashboard/editor')}
                  className="px-3 py-1.5 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/40 transition-colors text-sm flex items-center gap-1.5"
                >
                  <Edit className="h-4 w-4" />
                  Editor
                </button>
              </div>
            )}
          </div>
          
          <nav className="flex-1 px-3 py-2">
            <ul className="space-y-2">
              <li>
                <Link
                  href="/dashboard"
                  className={cn(
                    "flex items-center px-3 py-2 rounded-lg transition-colors",
                    isActive('/dashboard') 
                      ? "bg-blue-600/80 text-white" 
                      : "text-gray-400 hover:bg-gray-800/70 hover:text-white",
                    !isSidebarVisible && "justify-center py-3"
                  )}
                  onClick={() => setActiveSection('home')}
                >
                  <Home className={cn(
                    "mr-3",
                    isSidebarVisible ? "h-5 w-5" : "h-7 w-7 mr-0"
                  )} />
                  {isSidebarVisible && <span>Home</span>}
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/actionables"
                  className={cn(
                    "flex items-center px-3 py-2 rounded-lg transition-colors",
                    isActive('/dashboard/actionables') 
                      ? "bg-blue-600/80 text-white" 
                      : "text-gray-400 hover:bg-gray-800/70 hover:text-white",
                    !isSidebarVisible && "justify-center py-3"
                  )}
                  onClick={() => setActiveSection('actionables')}
                >
                  <CheckSquare className={cn(
                    "mr-3",
                    isSidebarVisible ? "h-5 w-5" : "h-7 w-7 mr-0"
                  )} />
                  {isSidebarVisible && <span>Actionables</span>}
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/settings"
                  className={cn(
                    "flex items-center px-3 py-2 rounded-lg transition-colors",
                    isActive('/dashboard/settings') 
                      ? "bg-blue-600/80 text-white" 
                      : "text-gray-400 hover:bg-gray-800/70 hover:text-white",
                    !isSidebarVisible && "justify-center py-3"
                  )}
                  onClick={() => setActiveSection('settings')}
                >
                  <Settings className={cn(
                    "mr-3",
                    isSidebarVisible ? "h-5 w-5" : "h-7 w-7 mr-0"
                  )} />
                  {isSidebarVisible && <span>Settings</span>}
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
      
      {/* New User Dialog */}
      <Dialog open={isNewUserDialogOpen} onOpenChange={setIsNewUserDialogOpen}>
        <DialogContent className="bg-gray-900/95 backdrop-blur-sm border border-white/10 text-white max-w-3xl">
          <div className="relative">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
                Welcome to Your Dashboard!
              </h2>
              <div className="space-y-4 text-gray-300">
                <p>
                  This is your personal space to create and manage your life blueprint. Here&apos;s how it works:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <h3 className="font-medium text-white mb-2">Viewer Mode</h3>
                    <p className="text-sm">
                      View your completed blueprint sections and responses. Hover over subsections to see detailed descriptions.
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <h3 className="font-medium text-white mb-2">Editor Mode</h3>
                    <p className="text-sm">
                      Make changes to your blueprint. Work through sections in order and bookmark important areas to revisit.
                    </p>
                  </div>
                </div>
                <p className="text-sm">
                  Start by clicking the &quot;Editor&quot; button to begin creating your blueprint. You can switch between viewer and editor modes at any time.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 