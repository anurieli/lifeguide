'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function WelcomePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const { signIn } = useAuth();

  useEffect(() => {
    const hasVisited = localStorage.getItem('hasVisited');
    if (!hasVisited) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('hasVisited', 'true');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900 rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 z-50"
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Ready to Lock In?</h2>
              <p className="text-gray-400 mb-8">
                Welcome to LifeGuide! We&apos;re here to help you organize your life, define your goals,
                and build the resilience you need to achieve them.
              </p>

              <div className="flex flex-col gap-4">
                <button
                  onClick={() => {
                    signIn();
                    handleClose();
                  }}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                >
                  Sign in with Google
                </button>

                <Link
                  href="/guide"
                  onClick={handleClose}
                  className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors"
                >
                  View Guide
                </Link>

                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-300 transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 