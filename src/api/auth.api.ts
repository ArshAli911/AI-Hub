import { apiClient } from './client';

// Placeholder for authentication API
export const authApi = {
  login: async (credentials: any) => {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  register: async (userData: any) => {
    try {
      const response = await apiClient.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Add more authentication-related functions here
}; 