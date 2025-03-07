'use client';

import { useState, useEffect } from 'react';
import { Info, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface MobileBannerProps {
  className?: string;
}

export default function MobileBanner({ className = '' }: MobileBannerProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if the device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    // Check if the banner was previously dismissed
    const dismissed = localStorage.getItem('mobileBannerDismissed');
    if (dismissed) {
      setIsDismissed(true);
    }
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const dismissBanner = () => {
    setIsDismissed(true);
    localStorage.setItem('mobileBannerDismissed', 'true');
  };

  // Don't show on desktop or if dismissed
  if (!isMobile || isDismissed) return null;

  return (
    <>
      <div className={`fixed top-16 left-0 right-0 z-45 bg-amber-500/90 backdrop-blur-sm text-black py-2 px-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Info className="h-4 w-4 mr-2" />
            <p className="text-sm font-medium">LifeGuide is meant to be used on Desktop</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsDialogOpen(true)}
              className="text-xs bg-black/10 hover:bg-black/20 text-black"
            >
              More Info
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={dismissBanner}
              className="p-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Using LifeGuide on Mobile</DialogTitle>
            <DialogDescription>
              While LifeGuide is optimized for desktop use, here's how to make the most of it on your mobile device.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <h3 className="font-medium text-sm">View Mode Only</h3>
              <p className="text-sm text-gray-500 mt-1">
                On mobile devices, you can view your guide and completed sections, but editing functionality is limited to desktop.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-sm">Navigation</h3>
              <p className="text-sm text-gray-500 mt-1">
                Use the bottom navigation bar to move between different sections of the app. The tab at the top of this bar can hide/show the navigation.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-sm">Best Experience</h3>
              <p className="text-sm text-gray-500 mt-1">
                For the full experience including editing your blueprint, please use a desktop or laptop computer.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-sm">Coming Soon</h3>
              <p className="text-sm text-gray-500 mt-1">
                We're working on a fully mobile-optimized experience. Stay tuned for updates!
              </p>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setIsDialogOpen(false)}>Got it</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 