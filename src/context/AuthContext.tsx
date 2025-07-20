// src/context/AuthContext.tsx

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { auth } from '../services/firebase'; // Import Firebase auth instance
import { firebaseAuthApi, FirebaseLoginCredentials, FirebaseAuthUser } from '../api/auth.api'; // Import auth API functions
import { User } from '../types'; // Assuming you have a User type defined from your types folder
import { User as FirebaseUser } from 'firebase/auth'; // Import Firebase User type specifically

interface AuthContextType {
  user: User | null;
  loading: boolean; // Add loading state for initial auth check
  signIn: (credentials: FirebaseLoginCredentials) => Promise<FirebaseAuthUser>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Start as true for initial check

  useEffect(() => {
    // Firebase listener for auth state changes
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        setUser({ 
          id: firebaseUser.uid, 
          email: firebaseUser.email || '', 
          token: token, 
          displayName: firebaseUser.displayName || undefined, // Populate displayName
          photoURL: firebaseUser.photoURL || undefined, // Populate photoURL
        });
      } else {
        setUser(null);
      }
      setLoading(false); // Auth check complete
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const signIn = async (credentials: FirebaseLoginCredentials) => {
    try {
      const response = await firebaseAuthApi.login(credentials);
      // setUser is already handled by onAuthStateChanged listener
      console.log('Signed in successfully');
      return response; // Return response if needed by component
    } catch (error) {
      console.error('Sign In Error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseAuthApi.signOut();
      // setUser is already handled by onAuthStateChanged listener
      console.log('Signed out successfully');
    } catch (error) {
      console.error('Sign Out Error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
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