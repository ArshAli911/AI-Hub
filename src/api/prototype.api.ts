import { apiClient } from './client';

// Placeholder for prototype API
export const prototypeApi = {
  getPrototypes: async () => {
    try {
      const response = await apiClient.get('/prototypes');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getPrototypeById: async (id: string) => {
    try {
      const response = await apiClient.get(`/prototypes/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createPrototype: async (data: any) => {
    try {
      const response = await apiClient.post('/prototypes', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Add more prototype-related functions here
}; 