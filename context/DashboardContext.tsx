'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';

interface DashboardContextType {
  isSidebarVisible: boolean;
  toggleSidebar: () => void;
  user: User | null;
  activeSection: string;
  setActiveSection: (section: string) => void;
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
  
  const toggleSidebar = () => setIsSidebarVisible(!isSidebarVisible);
  
  return (
    <DashboardContext.Provider value={{ 
      isSidebarVisible, 
      toggleSidebar,
      user,
      activeSection,
      setActiveSection
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