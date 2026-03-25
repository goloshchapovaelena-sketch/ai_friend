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

// Обработка ошибок авторизации и автоматическое обновление токена
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Если ошибка 401 и запрос ещё не был повторён
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          // Пытаемся обновить токен
          const response = await axios.post('/api/auth/refresh', {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token: newRefreshToken } = response.data;
          localStorage.setItem('token', access_token);
          if (newRefreshToken) {
            localStorage.setItem('refresh_token', newRefreshToken);
          }

          // Повторяем оригинальный запрос с новым токеном
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Не удалось обновить токен — выходим
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // Нет refresh токена — выходим
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
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
    try {
      const response = await api.post('/chat/send', {
        message,
        friend_id: friendId,
        language: language || 'ru',
      });
      return response.data;
    } catch (error: any) {
      // Пробрасываем ошибку дальше для обработки в компоненте
      if (error.response?.status === 403) {
        const detail = error.response?.data?.detail;
        throw new SubscriptionLimitError(
          detail?.message || 'Лимит сообщений исчерпан',
          detail?.messages_count || 5,
          detail?.messages_limit || 5
        );
      }
      throw error;
    }
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

// Subscription API
export const subscriptionApi = {
  get: async () => {
    const response = await api.get('/subscription');
    return response.data;
  },

  activate: async (planType: 'monthly' | 'yearly') => {
    const response = await api.post('/subscription/activate', {
      plan_type: planType,
      payment_method: 'card',
    });
    return response.data;
  },

  resetCounter: async () => {
    const response = await api.post('/subscription/reset-counter');
    return response.data;
  },
};

// Custom error for subscription limit
export class SubscriptionLimitError extends Error {
  messagesCount: number;
  messagesLimit: number;

  constructor(message: string, messagesCount: number, messagesLimit: number) {
    super(message);
    this.name = 'SubscriptionLimitError';
    this.messagesCount = messagesCount;
    this.messagesLimit = messagesLimit;
  }
}

export default api;
