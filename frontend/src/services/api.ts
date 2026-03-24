import axios from 'axios';
import type { Token } from '@/types';

// Используем переменную окружения для production или proxy для разработки
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Создаём базовый экземпляр axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// Добавляем JWT токен к запросам
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Обработка ошибок авторизации
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: async (email: string, password: string) => {
    const response = await api.post<Token>('/auth/register', { email, password });
    return response.data;
  },
  
  login: async (email: string, password: string) => {
    const response = await api.post<Token>('/auth/login', {
      email,
      password,
    });

    return response.data;
  },
  
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Friends API
export const friendsApi = {
  list: async () => {
    const response = await api.get('/friends/');
    return response.data;
  },
  
  get: async (friendId: number) => {
    const response = await api.get(`/friends/${friendId}`);
    return response.data;
  },
  
  create: async (
    name: string,
    personality?: string,
    tone?: string,
    gender?: string,
    age?: string,
    interests?: string[],
    scenario?: string
  ) => {
    const response = await api.post('/friends/', {
      name,
      personality,
      tone,
      gender,
      age,
      interests,
      scenario,
    });
    return response.data;
  },
  
  update: async (friendId: number, data: { name?: string; personality?: string; tone?: string }) => {
    const response = await api.put(`/friends/${friendId}`, data);
    return response.data;
  },
  
  delete: async (friendId: number) => {
    const response = await api.delete(`/friends/${friendId}`);
    return response.data;
  },
};

// Chat API
export const chatApi = {
  send: async (message: string, friendId: number, language?: string) => {
    const response = await api.post('/chat/send', { 
      message, 
      friend_id: friendId,
      language: language || 'ru',
    });
    return response.data;
  },
  
  history: async (friendId: number, limit: number = 50) => {
    const response = await api.get(`/chat/history/${friendId}`, {
      params: { limit },
    });
    return response.data;
  },
  
  memories: async (friendId: number, limit: number = 20) => {
    const response = await api.get(`/chat/memories/${friendId}`, {
      params: { limit },
    });
    return response.data;
  },
};

export default api;
