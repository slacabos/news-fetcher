import axios from 'axios';
import { SummaryWithSources, Topic } from '../types';

const API_BASE_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const summaryApi = {
  getLatest: async (): Promise<SummaryWithSources> => {
    const response = await api.get('/summaries/latest');
    return response.data;
  },

  getAll: async (filters?: { date?: string; topic?: string }): Promise<SummaryWithSources[]> => {
    const response = await api.get('/summaries', { params: filters });
    return response.data;
  },

  getById: async (id: number): Promise<SummaryWithSources> => {
    const response = await api.get(`/summaries/${id}`);
    return response.data;
  },
};

export const topicApi = {
  getAll: async (): Promise<Topic[]> => {
    const response = await api.get('/topics');
    return response.data;
  },
};

export const fetchApi = {
  trigger: async (topic: string = 'AI'): Promise<{ message: string; summary: SummaryWithSources }> => {
    const response = await api.post('/fetch', { topic });
    return response.data;
  },
};
