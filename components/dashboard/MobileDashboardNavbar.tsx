'use client';

import { useDashboard } from '@/context/DashboardContext';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Settings, CheckSquare, Edit, HelpCircle } from 'lucide-react';
import { cn } from '@/utils/utils';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";

export function MobileDashboardNavbar() {
  const { activeSection, setActiveSection, isMobile } = useDashboard();
  const pathname = usePathname();
  const router = useRouter();
  const [isNewUserDialogOpen, setIsNewUserDialogOpen] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);
  
  // Check if the mobile banner is visible
  useEffect(() => {
    const checkBannerStatus = () => {
      // We'll use a class on the body to track banner status
      const isBannerDismissed = document.body.classList.contains('banner-dismissed');
      setBannerVisible(!isBannerDismissed);
    };
    
    // Initial check
    checkBannerStatus();
    
    // Create a mutation observer to watch for changes to the body class
    const observer = new MutationObserver(checkBannerStatus);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);
  
  // Hide navbar completely when in editor mode
  if (pathname === '/dashboard/editor' || !isMobile) {
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
        "fixed left-0 right-0 z-30 w-full bg-gray-900/95 backdrop-blur-sm border-b border-white/10 shadow-md",
        bannerVisible ? "top-[72px]" : "top-[56px]" // Adjust based on banner visibility
      )}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard"
              className={cn(
                "flex items-center justify-center p-2 rounded-lg transition-colors",
                isActive('/dashboard') 
                  ? "bg-blue-600/80 text-white" 
                  : "text-gray-400 hover:bg-gray-800/70 hover:text-white"
              )}
              onClick={() => setActiveSection('home')}
            >
              <Home className="h-5 w-5" />
            </Link>
            
            <Link
              href="/dashboard/actionables"
              className={cn(
                "flex items-center justify-center p-2 rounded-lg transition-colors",
                isActive('/dashboard/actionables') 
                  ? "bg-blue-600/80 text-white" 
                  : "text-gray-400 hover:bg-gray-800/70 hover:text-white"
              )}
              onClick={() => setActiveSection('actionables')}
            >
              <CheckSquare className="h-5 w-5" />
            </Link>
            
            <Link
              href="/dashboard/settings"
              className={cn(
                "flex items-center justify-center p-2 rounded-lg transition-colors",
                isActive('/dashboard/settings') 
                  ? "bg-blue-600/80 text-white" 
                  : "text-gray-400 hover:bg-gray-800/70 hover:text-white"
              )}
              onClick={() => setActiveSection('settings')}
            >
              <Settings className="h-5 w-5" />
            </Link>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsNewUserDialogOpen(true)}
              className="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/40 transition-colors"
            >
              <HelpCircle className="h-5 w-5" />
            </button>
            
            <button
              onClick={() => router.push('/dashboard/editor')}
              className="p-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/40 transition-colors"
            >
              <Edit className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Spacer to prevent content from being hidden under the fixed navbar */}
      <div className="h-[40px]"></div>
      
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