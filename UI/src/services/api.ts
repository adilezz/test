// API Service Layer matching the backend endpoints exactly

import {
  LoginRequest,
  LoginResponse,
  TokenRefreshRequest,
  PasswordChangeRequest,
  UserResponse,
  UserUpdate,
  UserCreate,
  UniversityResponse,
  FacultyResponse,
  SchoolResponse,
  DepartmentResponse,
  CategoryResponse,
  KeywordResponse,
  AcademicPersonResponse,
  DegreeResponse,
  LanguageResponse,
  ThesisResponse,
  ThesisCreate,
  ThesisUpdate,
  SearchRequest,
  PaginatedResponse,
  BaseResponse,
  FileUploadResponse,
  StatisticsResponse,
  TreeNodeData,
  ErrorResponse
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.loadToken();
  }

  private loadToken() {
    this.token = localStorage.getItem('access_token');
  }

  private saveToken(token: string) {
    this.token = token;
    localStorage.setItem('access_token', token);
  }

  private removeToken() {
    this.token = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (options.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]) => {
          headers[key] = String(value);
        });
      } else {
        Object.assign(headers, options.headers as Record<string, string>);
      }
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new ApiError(
          response.status,
          errorData.error.code,
          errorData.error.message,
          errorData.error.details
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'NETWORK_ERROR', 'Network request failed');
    }
  }

  // Authentication endpoints
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    this.saveToken(response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);
    return response;
  }

  async logout(): Promise<BaseResponse> {
    const response = await this.request<BaseResponse>('/auth/logout', {
      method: 'POST',
    });
    this.removeToken();
    return response;
  }

  async register(data: UserCreate): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.saveToken(response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);
    return response;
  }

  async refreshToken(): Promise<LoginResponse> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new ApiError(401, 'NO_REFRESH_TOKEN', 'No refresh token available');
    }

    const response = await this.request<LoginResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    this.saveToken(response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);
    return response;
  }

  async getProfile(): Promise<UserResponse> {
    return this.request<UserResponse>('/auth/profile');
  }

  async updateProfile(data: UserUpdate): Promise<UserResponse> {
    return this.request<UserResponse>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async changePassword(data: PasswordChangeRequest): Promise<BaseResponse> {
    return this.request<BaseResponse>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Public Tree endpoints
  async getUniversitiesTree(
    includeTheses: boolean = false,
    thesesPerDepartment: number = 3
  ): Promise<TreeNodeData[]> {
    const params = new URLSearchParams({
      include_counts: 'true',
      include_theses: includeTheses.toString(),
      theses_per_department: thesesPerDepartment.toString(),
    });
    
    return this.request<TreeNodeData[]>(`/universities/tree?${params}`);
  }

  async getSchoolsTree(
    includeTheses: boolean = false,
    thesesPerDepartment: number = 3
  ): Promise<TreeNodeData[]> {
    const params = new URLSearchParams({
      include_counts: 'true',
      include_theses: includeTheses.toString(),
      theses_per_department: thesesPerDepartment.toString(),
    });
    
    return this.request<TreeNodeData[]>(`/schools/tree?${params}`);
  }

  async getCategoriesTree(): Promise<TreeNodeData[]> {
    return this.request<TreeNodeData[]>('/categories/tree');
  }

  async getGeographicEntitiesTree(): Promise<TreeNodeData[]> {
    return this.request<TreeNodeData[]>('/geographic-entities/tree');
  }

  // Public List endpoints
  async getUniversities(
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    return this.request<PaginatedResponse>(`/universities?${params}`);
  }

  async getFaculties(
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    return this.request<PaginatedResponse>(`/faculties?${params}`);
  }

  async getSchools(
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    return this.request<PaginatedResponse>(`/schools?${params}`);
  }

  async getDepartments(
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    return this.request<PaginatedResponse>(`/departments?${params}`);
  }

  async getCategories(
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    return this.request<PaginatedResponse>(`/categories?${params}`);
  }

  async getAcademicPersons(
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    return this.request<PaginatedResponse>(`/academic_persons?${params}`);
  }

  async getDegrees(
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    return this.request<PaginatedResponse>(`/degrees?${params}`);
  }

  async getLanguages(
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    return this.request<PaginatedResponse>(`/languages?${params}`);
  }

  // Admin endpoints for thesis management
  async getTheses(searchParams: Partial<SearchRequest> = {}): Promise<PaginatedResponse> {
    const params = new URLSearchParams();
    
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v.toString()));
        } else {
          params.append(key, value.toString());
        }
      }
    });
    
    return this.request<PaginatedResponse>(`/admin/theses?${params}`);
  }

  async getThesis(id: string): Promise<ThesisResponse> {
    return this.request<ThesisResponse>(`/admin/theses/${id}`);
  }

  async createThesis(data: ThesisCreate): Promise<ThesisResponse> {
    return this.request<ThesisResponse>('/admin/theses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateThesis(id: string, data: ThesisUpdate): Promise<ThesisResponse> {
    return this.request<ThesisResponse>(`/admin/theses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteThesis(id: string): Promise<BaseResponse> {
    return this.request<BaseResponse>(`/admin/theses/${id}`, {
      method: 'DELETE',
    });
  }

  async downloadThesis(id: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/theses/${id}/download`, {
      headers: this.token ? { 'Authorization': `Bearer ${this.token}` } : {},
    });
    
    if (!response.ok) {
      throw new ApiError(response.status, 'DOWNLOAD_ERROR', 'Failed to download thesis');
    }
    
    return response.blob();
  }

  // File upload
  async uploadFile(file: File, onProgress?: (progress: number) => void): Promise<FileUploadResponse> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            onProgress(progress);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new ApiError(xhr.status, 'PARSE_ERROR', 'Failed to parse response'));
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject(new ApiError(xhr.status, errorData.error.code, errorData.error.message));
          } catch (error) {
            reject(new ApiError(xhr.status, 'UPLOAD_ERROR', 'File upload failed'));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new ApiError(0, 'NETWORK_ERROR', 'Network error during upload'));
      });

      xhr.open('POST', `${this.baseUrl}/admin/files/upload`);
      if (this.token) {
        xhr.setRequestHeader('Authorization', `Bearer ${this.token}`);
      }
      
      xhr.send(formData);
    });
  }

  // Statistics
  async getStatistics(): Promise<StatisticsResponse> {
    return this.request<StatisticsResponse>('/statistics');
  }

  // Health check
  async healthCheck(): Promise<BaseResponse> {
    return this.request<BaseResponse>('/health');
  }
}

export const apiService = new ApiService();
export { ApiError };
export default apiService;