// src/context/AuthContext.tsx

import React, { createContext, useState, useContext, ReactNode } from 'react';

interface AuthContextType {
  user: any;
  signIn: (userData: any) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: any }) => {
  const [user, setUser] = useState(null);

  const signIn = (userData: any) => {
    // Implement actual sign-in logic (e.g., call API)
    setUser(userData);
  };

  const signOut = () => {
    // Implement actual sign-out logic
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};