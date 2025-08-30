import api from '../utils/api';
import { Thesis, SearchFilters, SearchResult } from '../types';

export interface SearchParams {
  query?: string;
  filters?: Partial<SearchFilters>;
  page?: number;
  pageSize?: number;
  sortBy?: string;
}

export interface UploadThesisRequest {
  title: string;
  author: string;
  director: string;
  coDirector?: string;
  institution: string;
  faculty: string;
  discipline: string;
  subdiscipline?: string;
  year: number;
  defendedDate?: string;
  abstract: string;
  keywords: string[];
  language: 'fr' | 'ar' | 'en' | 'tzm';
  juryCo1?: string;
  juryCo2?: string;
}

export const thesesService = {
  async search(params: SearchParams): Promise<SearchResult> {
    const response = await api.get('/search', { params });
    return response.data;
  },

  async getThesis(id: string): Promise<Thesis> {
    const response = await api.get(`/theses/${id}`);
    return response.data;
  },

  async uploadThesis(thesisData: UploadThesisRequest, file: File): Promise<Thesis> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('data', JSON.stringify(thesisData));

    const response = await api.post('/theses', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getFeaturedTheses(): Promise<Thesis[]> {
    const response = await api.get('/theses/featured');
    return response.data;
  },

  async getPopularTheses(): Promise<Thesis[]> {
    const response = await api.get('/theses/popular');
    return response.data;
  },

  async getRecentTheses(): Promise<Thesis[]> {
    const response = await api.get('/theses/recent');
    return response.data;
  },

  async getUserTheses(userId: string): Promise<Thesis[]> {
    const response = await api.get(`/users/${userId}/theses`);
    return response.data;
  },

  async downloadThesis(id: string): Promise<string> {
    const response = await api.get(`/theses/${id}/download`, {
      responseType: 'blob'
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  },

  async incrementViewCount(id: string): Promise<void> {
    await api.post(`/theses/${id}/view`);
  },

  async addToFavorites(id: string): Promise<void> {
    await api.post(`/theses/${id}/favorite`);
  },

  async removeFromFavorites(id: string): Promise<void> {
    await api.delete(`/theses/${id}/favorite`);
  },

  async getRelatedTheses(id: string): Promise<Thesis[]> {
    const response = await api.get(`/theses/${id}/related`);
    return response.data;
  }
};