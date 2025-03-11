'use client';

import { useRouter } from 'next/navigation';
import EditorMode from './index';
import { useEffect, useState } from 'react';
import MobileEditorNotice from './mobile-notice';

export default function EditorPage() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Check if the device is mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const handleClose = () => {
    router.push('/dashboard');
  };
  
  // Show mobile notice on mobile devices
  if (isMobile) {
    return <div className="editor p-0 m-0"><MobileEditorNotice /></div>;
  }
  
  return <div className="editor"><EditorMode onClose={handleClose} /></div>;
} 