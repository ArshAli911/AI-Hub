import { create } from 'zustand';
import { User } from '../types';

interface UserProfileState {
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;
}

interface UserStoreActions {
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateProfile: (userData: Partial<User>) => void;
}

export const useUserStore = create<UserProfileState & UserStoreActions>((set) => ({
  currentUser: null,
  isLoading: false,
  error: null,
  setUser: (user) => set({ currentUser: user, isLoading: false, error: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),
  updateProfile: (userData) =>
    set((state) => ({
      currentUser: state.currentUser ? { ...state.currentUser, ...userData } : null,
    })),
})); 