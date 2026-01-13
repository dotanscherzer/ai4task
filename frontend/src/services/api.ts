import axios from 'axios';
import { Interview, Challenge, Topic } from '../types';

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

// Handle 401/403 errors (expired/invalid token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token is invalid or expired
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

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

// Topics API
export const topicsAPI = {
  list: async (): Promise<Topic[]> => {
    const response = await api.get<Topic[]>('/topics');
    return response.data;
  },
  get: async (id: string): Promise<Topic> => {
    const response = await api.get<Topic>(`/topics/${id}`);
    return response.data;
  },
  getByNumber: async (number: number): Promise<Topic> => {
    const response = await api.get<Topic>(`/topics/number/${number}`);
    return response.data;
  },
  create: async (data: {
    number: number;
    label: string;
    description: string;
    exampleQuestions?: string[];
  }): Promise<Topic> => {
    const response = await api.post<Topic>('/topics', data);
    return response.data;
  },
  update: async (id: string, data: {
    number?: number;
    label?: string;
    description?: string;
    exampleQuestions?: string[];
  }): Promise<Topic> => {
    const response = await api.put<Topic>(`/topics/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/topics/${id}`);
    return response.data;
  },
};

// Challenges API
export const challengesAPI = {
  list: async (): Promise<Challenge[]> => {
    const response = await api.get<Challenge[]>('/challenges');
    return response.data;
  },
  get: async (id: string): Promise<Challenge> => {
    const response = await api.get<Challenge>(`/challenges/${id}`);
    return response.data;
  },
  create: async (data: {
    name: string;
    description: string;
    topicNumbers: number[];
  }): Promise<Challenge> => {
    const response = await api.post<Challenge>('/challenges', data);
    return response.data;
  },
  update: async (id: string, data: {
    name?: string;
    description?: string;
    topicNumbers?: number[];
  }): Promise<Challenge> => {
    const response = await api.put<Challenge>(`/challenges/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/challenges/${id}`);
    return response.data;
  },
  getTopics: async (id: string) => {
    const response = await api.get(`/challenges/${id}/topics`);
    return response.data;
  },
  getQuestions: async (id: string) => {
    const response = await api.get(`/challenges/${id}/questions`);
    return response.data;
  },
  createQuestion: async (id: string, data: {
    topicNumber: number;
    questionText: string;
  }) => {
    const response = await api.post(`/challenges/${id}/questions`, data);
    return response.data;
  },
  updateQuestion: async (id: string, questionId: string, questionText: string) => {
    const response = await api.put(`/challenges/${id}/questions/${questionId}`, { questionText });
    return response.data;
  },
  deleteQuestion: async (id: string, questionId: string) => {
    const response = await api.delete(`/challenges/${id}/questions/${questionId}`);
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
    challengeId?: string;
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

