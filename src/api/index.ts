import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authApi = {
  login: (credentials: any) => api.post('/auth/login', credentials),
  register: (userData: any) => api.post('/auth/register', userData),
};

export const mentorsApi = {
  getMentors: () => api.get('/mentors'),
  requestSession: (sessionId: string, data: any) => api.post(`/mentors/${sessionId}/request`, data),
  rateMentor: (mentorId: string, rating: number, review: string) => api.post(`/mentors/${mentorId}/review`, { rating, review }),
  getBookedSessions: () => api.get('/mentors/sessions'),
};

// Add more API services as needed (e.g., communityApi, marketplaceApi, etc.) 