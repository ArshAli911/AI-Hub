import { create } from 'zustand';
import { User, AuthState } from '../types';

interface AuthStore extends AuthState {
  signIn: (user: User) => void;
  signOut: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: false,
  error: null,
  signIn: (user: User) => set({ user, isLoading: false, error: null }),
  signOut: () => set({ user: null, isLoading: false, error: null }),
  setError: (error: string | null) => set({ error, isLoading: false }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
})); 