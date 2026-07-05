import axios from 'axios';
import { getClientAuth } from './firebase';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add Firebase Auth ID Token automatically
api.interceptors.request.use(
  async (config) => {
    try {
      const auth = getClientAuth();
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error attaching Auth ID token', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
