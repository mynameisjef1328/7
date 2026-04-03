import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach auth token
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const authAPI = {
  register: (email: string, password: string) =>
    api.post<{ token: string; userId: string }>('/api/auth/register', { email, password }),

  login: (email: string, password: string) =>
    api.post<{ token: string; userId: string }>('/api/auth/login', { email, password }),
};

// User
export const userAPI = {
  getProfile: () => api.get('/api/user/profile'),

  updateProfile: (data: {
    streaming_services?: string[];
    taste_profile?: Record<string, unknown>;
  }) => api.put('/api/user/profile', data),

  recordHistory: (data: {
    tmdb_id: number;
    media_type: string;
    title: string;
    action: 'save' | 'skip' | 'seen';
    mood?: string;
    genre?: string;
  }) => api.post('/api/user/history', data),
};

// Picks
export const picksAPI = {
  generate: (mood: string, genre?: string) =>
    api.post('/api/picks/generate', { mood, genre }),

  getDetail: (mediaType: string, tmdbId: number) =>
    api.get(`/api/picks/detail/${mediaType}/${tmdbId}`),
};

// Watchlist
export const watchlistAPI = {
  getAll: (params?: { service?: string; watched?: boolean }) =>
    api.get('/api/watchlist', { params }),

  add: (item: {
    tmdb_id: number;
    media_type: string;
    title: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
    tagline?: string | null;
    genres?: string[];
    runtime?: number | null;
    release_date?: string | null;
    vote_average?: number;
    overview?: string | null;
    streaming_services?: string[];
    why_picked?: string;
  }) => api.post('/api/watchlist', item),

  remove: (id: string) => api.delete(`/api/watchlist/${id}`),

  markWatched: (id: string, watched: boolean) =>
    api.patch(`/api/watchlist/${id}/watched`, { watched }),
};

export default api;
