export interface User {
  id: string;
  email: string;
  username?: string;
  token: string;
  // Add other user-related fields as needed
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType {
  authState: AuthState;
  signIn: (credentials: any) => Promise<void>;
  signUp: (userData: any) => Promise<void>;
  signOut: () => void;
  // Add other auth-related functions as needed
} 