'use client';


import { useState, useEffect } from 'react';

// This component will wrap your app to provide debugging tools
export function DebugLayout({ children }: { children: React.ReactNode }) {
  const [isDebugEnabled, setIsDebugEnabled] = useState(false);

  // Toggle debug panel with Ctrl+Shift+D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsDebugEnabled(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {children}
      {/* Tiny indicator in the corner */}
      <div 
        className="fixed bottom-0 left-0 bg-black/50 text-xs text-white p-1 z-50"
        onClick={() => setIsDebugEnabled(prev => !prev)}
      >
        Debug: {isDebugEnabled ? 'ON' : 'OFF'}
      </div>
    </>
  );
} 