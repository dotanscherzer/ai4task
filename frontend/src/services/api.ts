import axios from 'axios';
import { Interview } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  register: async (email: string, password: string) => {
    const response = await api.post('/auth/register', { email, password });
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Interviews API
export const interviewsAPI = {
  list: async (): Promise<Interview[]> => {
    const response = await api.get<Interview[]>('/interviews');
    return response.data;
  },
  get: async (id: string) => {
    const response = await api.get(`/interviews/${id}`);
    return response.data;
  },
  create: async (data: {
    managerName: string;
    managerRole?: string;
    adminEmail?: string;
    selectedTopics: number[];
  }) => {
    const response = await api.post('/interviews', data);
    return response.data;
  },
  getQuestions: async (id: string) => {
    const response = await api.get(`/interviews/${id}/questions`);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/interviews/${id}`);
    return response.data;
  },
};

// Manager API
export const managerAPI = {
  getState: async (shareToken: string) => {
    const response = await api.post('/manager/state', { share_token: shareToken });
    return response.data;
  },
  postMessage: async (shareToken: string, message: string, action: string) => {
    const response = await api.post('/manager/message', {
      share_token: shareToken,
      message,
      action,
    });
    return response.data;
  },
  complete: async (shareToken: string) => {
    const response = await api.post('/manager/complete', { share_token: shareToken });
    return response.data;
  },
};

// Email API
export const emailAPI = {
  send: async (interviewId: string) => {
    const response = await api.post('/email/send', { interview_id: interviewId });
    return response.data;
  },
};

export default api;

