'use client';

import { useState, useEffect } from 'react';
import { Info, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';

interface MobileBannerProps {
  className?: string;
}

// Gradient text style matching the platform
const gradientText = "bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text";

export default function MobileBanner({ className = '' }: MobileBannerProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const pathname = usePathname();
  
  // Check if we're on the homepage
  const isHomepage = pathname === '/';

  // Check if the device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    
    // Initial check
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const dismissBanner = () => {
    setIsVisible(false);
    
    // Add a class to the main element to adjust its padding when banner is closed
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.classList.add('banner-dismissed');
    }
  };

  // Don't show on desktop or if dismissed
  if (!isMobile || !isVisible) {
    return null;
  }

  return (
    <>
      <div 
        className={`fixed ${isHomepage ? 'top-26' : 'top-16'} left-0 right-0 z-35 bg-gradient-to-r from-blue-500/90 to-purple-600/90 backdrop-blur-sm text-white py-1.5 px-3 ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Info className="h-3 w-3 mr-1.5" />
            <p className="text-xs font-medium">LifeGuide is meant to be used on Desktop</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsDialogOpen(true)}
              className="text-xs bg-white/10 hover:bg-white/20 text-white py-1 px-2 h-auto"
            >
              More Info
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={dismissBanner}
              className="p-1 text-white hover:bg-white/10 h-6 w-6"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className={`text-2xl font-bold ${gradientText}`}>
              Using LifeGuide on Mobile
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              While LifeGuide is optimized for desktop use, here's how to make the most of it on your mobile device.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <h3 className={`font-medium text-sm ${gradientText}`}>View Mode Only</h3>
              <p className="text-sm text-white mt-1">
                On mobile devices, you can view your guide and completed sections, but editing functionality is limited to desktop.
              </p>
            </div>
            
            <div>
              <h3 className={`font-medium text-sm ${gradientText}`}>Navigation</h3>
              <p className="text-sm text-white mt-1">
                Use the bottom navigation bar to move between different sections of the app. The tab at the top of this bar can hide/show the navigation.
              </p>
            </div>
            
            <div>
              <h3 className={`font-medium text-sm ${gradientText}`}>Best Experience</h3>
              <p className="text-sm text-white mt-1">
                For the full experience including editing your blueprint, please use a desktop or laptop computer.
              </p>
            </div>
            
            <div>
              <h3 className={`font-medium text-sm ${gradientText}`}>Coming Soon</h3>
              <p className="text-sm text-white mt-1">
                We're working on a fully mobile-optimized experience. Stay tuned for updates!
              </p>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <Button 
              onClick={() => setIsDialogOpen(false)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 