import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api'; // Replace with your actual API base URL

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-type': 'application/json',
  },
});

// You might want to add interceptors here for handling tokens, errors, etc.
// apiClient.interceptors.request.use(
//   async (config) => {
//     const token = await AsyncStorage.getItem('userToken');
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// apiClient.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     // Handle token expiration or other errors
//     return Promise.reject(error);
//   }
// ); 