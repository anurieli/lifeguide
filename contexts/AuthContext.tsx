'use client';

import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';

// Mock user for development
const MOCK_USER: User = {
  id: 'b4b92493-74d6-4a14-a73b-7107eb0eab84',
  email: 'anurieli365@gmail.com',
  role: 'admin',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString()
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: MOCK_USER,
  loading: false,
  isAdmin: true,
  signIn: async () => {},
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthContext.Provider 
      value={{
        user: MOCK_USER,
        loading: false,
        isAdmin: true,
        signIn: async () => {},
        signOut: async () => {}
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 