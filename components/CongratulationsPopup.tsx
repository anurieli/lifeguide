'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, BookmarkIcon, Bell, Calendar, Smartphone } from 'lucide-react';
import dynamic from 'next/dynamic';

// Import confetti properly for client-side only
const ConfettiGenerator = dynamic(
  () => import('canvas-confetti'),
  { ssr: false }
);

interface CongratsPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CongratsPopup({ isOpen, onClose }: CongratsPopupProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  // Trigger confetti when the popup opens
  useEffect(() => {
    if (isOpen && !showConfetti && typeof window !== 'undefined') {
      setShowConfetti(true);
      
      // Use the confetti after making sure it's been loaded
      const runConfetti = async () => {
        const confettiModule = await import('canvas-confetti');
        const confetti = confettiModule.default;
        
        // Create a confetti cannon
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
  
        function randomInRange(min: number, max: number) {
          return Math.random() * (max - min) + min;
        }
  
        const interval = setInterval(function() {
          const timeLeft = animationEnd - Date.now();
  
          if (timeLeft <= 0) {
            return clearInterval(interval);
          }
  
          const particleCount = 50 * (timeLeft / duration);
          
          // Since particles fall down, start a bit higher than random
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: randomInRange(0, 0.2) }
          });
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: randomInRange(0, 0.2) }
          });
        }, 250);
  
        // Return cleanup function
        return () => clearInterval(interval);
      };
      
      // Run the confetti and store cleanup
      let cleanup: (() => void) | undefined;
      runConfetti().then(cleanupFn => {
        cleanup = cleanupFn;
      });
      
      // Clean up the interval when component unmounts
      return () => {
        if (cleanup) cleanup();
      };
    }
  }, [isOpen, showConfetti]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/75 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="bg-gradient-to-br from-gray-900 to-gray-800 border border-blue-500/30 rounded-xl shadow-xl max-w-md w-full overflow-hidden"
          >
            {/* Header with celebration graphics */}
            <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8 text-center">
              <button 
                onClick={onClose}
                className="absolute top-3 right-3 text-white/70 hover:text-white"
                aria-label="Close popup"
              >
                <X className="h-5 w-5" />
              </button>
              
              <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-4"
              >
                <div className="mx-auto bg-white/20 rounded-full p-3 w-16 h-16 flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-white" />
                </div>
              </motion.div>
              
              <motion.h2 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-white mb-2"
              >
                Congratulations!
              </motion.h2>
              
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-blue-100"
              >
                You've completed your guide!
              </motion.p>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <h3 className="text-xl font-semibold text-white mb-4">The Hard Part is Done!</h3>
              
              <p className="text-gray-300 mb-6">
                Now comes the maintenance part - just reading every day as often as possible. 
                This is where the real transformation happens!
              </p>
              
              <div className="space-y-4 mb-6">
                <h4 className="text-lg font-medium text-blue-400">What's Next?</h4>
                
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 bg-blue-500/20 p-1.5 rounded-lg">
                      <Smartphone className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-gray-200">Bookmark the dashboard page to your phone's browser for easy access</p>
                    </div>
                  </li>
                  
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 bg-blue-500/20 p-1.5 rounded-lg">
                      <Bell className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-gray-200">Set a reminder for morning and evening to review your guide</p>
                    </div>
                  </li>
                  
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 bg-blue-500/20 p-1.5 rounded-lg">
                      <Calendar className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-gray-200">Commit to at least 5 days of consistent practice</p>
                    </div>
                  </li>
                  
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 bg-blue-500/20 p-1.5 rounded-lg">
                      <BookmarkIcon className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-gray-200">Return to the editor when you need to adjust your responses</p>
                    </div>
                  </li>
                </ul>
              </div>
              
              <div className="bg-blue-900/30 border border-blue-800/50 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-200">
                  <strong>Pro Tip:</strong> Pay close attention to your behaviors and actions over the next week. 
                  Notice how your guide influences your choices and mindset.
                </p>
              </div>
              
              <button
                onClick={onClose}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors"
              >
                Continue My Journey
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
} 