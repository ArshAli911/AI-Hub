import { apiClient } from './client';

// Placeholder for mentor API
export const mentorApi = {
  getMentors: async () => {
    try {
      const response = await apiClient.get('/mentors');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getMentorById: async (id: string) => {
    try {
      const response = await apiClient.get(`/mentors/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Add more mentor-related functions here
}; 