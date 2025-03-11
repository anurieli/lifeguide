'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User } from '@supabase/supabase-js';

interface DashboardContextType {
  isSidebarVisible: boolean;
  toggleSidebar: () => void;
  user: User | null;
  activeSection: string;
  setActiveSection: (section: string) => void;
  isMobile: boolean;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ 
  children, 
  user 
}: { 
  children: ReactNode, 
  user: User | null 
}) {
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [activeSection, setActiveSection] = useState('home');
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Check if the device is mobile
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // Auto-hide sidebar on mobile
      if (mobile) {
        setIsSidebarVisible(false);
      }
    };
    
    // Initial check
    checkMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const toggleSidebar = () => setIsSidebarVisible(!isSidebarVisible);
  
  return (
    <DashboardContext.Provider value={{ 
      isSidebarVisible, 
      toggleSidebar,
      user,
      activeSection,
      setActiveSection,
      isMobile
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}; 