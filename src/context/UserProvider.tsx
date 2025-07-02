import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User } from '../types';

interface UserContextType {
  currentUser: User | null;
  updateUser: (userData: Partial<User>) => void;
  fetchUser: () => Promise<void>;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUser = async () => {
    setIsLoading(true);
    try {
      // In a real app, fetch user data from an API or local storage
      const mockUser: User = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        token: 'mock_token_for_user_provider',
        name: 'Test User',
        profilePicture: 'https://via.placeholder.com/150/FF0000/FFFFFF?text=TU',
        bio: 'This is a mock user bio.',
        posts: 10,
        followers: 100,
        following: 50,
      };
      setCurrentUser(mockUser);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    setCurrentUser((prevUser) => (prevUser ? { ...prevUser, ...userData } : null));
    // In a real app, you'd also persist this change to your backend/storage
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <UserContext.Provider value={{ currentUser, updateUser, fetchUser, isLoading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}; 