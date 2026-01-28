import axios from "axios";
import type { SummaryWithSources, Topic } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }
    return Promise.reject(error);
  }
);

export interface AuthUser {
  email: string;
  name: string;
  picture: string;
}

export const authApi = {
  loginWithGoogle: async (credential: string): Promise<{ user: AuthUser }> => {
    const response = await api.post("/auth/google", { credential });
    return response.data;
  },

  getMe: async (): Promise<{ user: AuthUser }> => {
    const response = await api.get("/auth/me");
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post("/auth/logout");
  },
};

export const summaryApi = {
  getLatest: async (): Promise<SummaryWithSources> => {
    const response = await api.get("/summaries/latest");
    return response.data;
  },

  getAll: async (filters?: {
    date?: string;
    topic?: string;
  }): Promise<SummaryWithSources[]> => {
    const response = await api.get("/summaries", { params: filters });
    return response.data;
  },

  getById: async (id: number): Promise<SummaryWithSources> => {
    const response = await api.get(`/summaries/${id}`);
    return response.data;
  },
};

export const topicApi = {
  getAll: async (): Promise<Topic[]> => {
    const response = await api.get("/topics");
    return response.data;
  },
};

export const fetchApi = {
  trigger: async (
    topic: string = "AI"
  ): Promise<{ message: string; summary: SummaryWithSources }> => {
    const response = await api.post("/fetch", { topic });
    return response.data;
  },
};

export const slackApi = {
  sendSummary: async (
    summaryId: number
  ): Promise<{
    success: boolean;
    error?: string;
    timestamp?: string;
    alreadyPosted?: boolean;
  }> => {
    const response = await api.post(`/slack/send/${summaryId}`);
    return response.data;
  },

  testWebhook: async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    const response = await api.post("/slack/test");
    return response.data;
  },
};
