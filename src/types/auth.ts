export interface User {
  id: string;
  email: string;
  username?: string;
  token: string;
  name?: string;
  displayName?: string; // Add displayName
  photoURL?: string; // Rename profilePicture to photoURL
  bio?: string;
  posts?: number;
  followers?: number;
  following?: number;
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