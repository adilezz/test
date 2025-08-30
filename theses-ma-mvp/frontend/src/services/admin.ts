import api from '../utils/api';
import { User, Thesis, Institution, Discipline, AdminStats } from '../types';

export interface AdminThesesParams {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
}

export interface AdminUsersParams {
  page?: number;
  pageSize?: number;
  role?: string;
  search?: string;
  isVerified?: boolean;
}

export const adminService = {
  // Dashboard
  async getStats(): Promise<AdminStats> {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  // Theses Management
  async getTheses(params: AdminThesesParams = {}) {
    const response = await api.get('/admin/theses', { params });
    return response.data;
  },

  async approveThesis(id: string): Promise<void> {
    await api.put(`/admin/theses/${id}/approve`);
  },

  async rejectThesis(id: string, reason: string): Promise<void> {
    await api.put(`/admin/theses/${id}/reject`, { reason });
  },

  async deleteThesis(id: string): Promise<void> {
    await api.delete(`/admin/theses/${id}`);
  },

  async updateThesis(id: string, data: Partial<Thesis>): Promise<Thesis> {
    const response = await api.put(`/admin/theses/${id}`, data);
    return response.data;
  },

  // Users Management
  async getUsers(params: AdminUsersParams = {}) {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  async verifyUser(id: string): Promise<void> {
    await api.put(`/admin/users/${id}/verify`);
  },

  async suspendUser(id: string, reason: string): Promise<void> {
    await api.put(`/admin/users/${id}/suspend`, { reason });
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/admin/users/${id}`);
  },

  async updateUserRole(id: string, role: string): Promise<void> {
    await api.put(`/admin/users/${id}/role`, { role });
  },

  // Institutions Management
  async getInstitutions(): Promise<Institution[]> {
    const response = await api.get('/admin/institutions');
    return response.data;
  },

  async createInstitution(data: Omit<Institution, 'id'>): Promise<Institution> {
    const response = await api.post('/admin/institutions', data);
    return response.data;
  },

  async updateInstitution(id: string, data: Partial<Institution>): Promise<Institution> {
    const response = await api.put(`/admin/institutions/${id}`, data);
    return response.data;
  },

  async deleteInstitution(id: string): Promise<void> {
    await api.delete(`/admin/institutions/${id}`);
  },

  // Disciplines Management
  async getDisciplines(): Promise<Discipline[]> {
    const response = await api.get('/admin/disciplines');
    return response.data;
  },

  async createDiscipline(data: Omit<Discipline, 'id'>): Promise<Discipline> {
    const response = await api.post('/admin/disciplines', data);
    return response.data;
  },

  async updateDiscipline(id: string, data: Partial<Discipline>): Promise<Discipline> {
    const response = await api.put(`/admin/disciplines/${id}`, data);
    return response.data;
  },

  async deleteDiscipline(id: string): Promise<void> {
    await api.delete(`/admin/disciplines/${id}`);
  }
};