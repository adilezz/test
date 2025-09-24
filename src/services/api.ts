import { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  User, 
  University, 
  Faculty, 
  School, 
  Degree, 
  Discipline, 
  SubDiscipline, 
  Specialty, 
  Thesis, 
  SearchParams, 
  SearchResponse,
  ApiError 
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('access_token');
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({ 
        detail: 'An error occurred' 
      }));
      throw new Error(error.detail);
    }

    return response.json();
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const formData = new FormData();
    formData.append('username', credentials.email);
    formData.append('password', credentials.password);

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({ 
        detail: 'Login failed' 
      }));
      throw new Error(error.detail);
    }

    const data: LoginResponse = await response.json();
    this.token = data.access_token;
    localStorage.setItem('access_token', data.access_token);
    return data;
  }

  async register(userData: RegisterRequest): Promise<User> {
    return this.request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  logout(): void {
    this.token = null;
    localStorage.removeItem('access_token');
  }

  // Reference data endpoints
  async getUniversities(): Promise<University[]> {
    return this.request<University[]>('/universities/');
  }

  async createUniversity(university: Omit<University, 'id' | 'created_at' | 'updated_at'>): Promise<University> {
    return this.request<University>('/universities/', {
      method: 'POST',
      body: JSON.stringify(university),
    });
  }

  async updateUniversity(id: number, university: Partial<University>): Promise<University> {
    return this.request<University>(`/universities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(university),
    });
  }

  async deleteUniversity(id: number): Promise<void> {
    return this.request<void>(`/universities/${id}`, {
      method: 'DELETE',
    });
  }

  async getFaculties(universityId?: number): Promise<Faculty[]> {
    const params = universityId ? `?university_id=${universityId}` : '';
    return this.request<Faculty[]>(`/faculties/${params}`);
  }

  async createFaculty(faculty: Omit<Faculty, 'id' | 'created_at' | 'updated_at'>): Promise<Faculty> {
    return this.request<Faculty>('/faculties/', {
      method: 'POST',
      body: JSON.stringify(faculty),
    });
  }

  async updateFaculty(id: number, faculty: Partial<Faculty>): Promise<Faculty> {
    return this.request<Faculty>(`/faculties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(faculty),
    });
  }

  async deleteFaculty(id: number): Promise<void> {
    return this.request<void>(`/faculties/${id}`, {
      method: 'DELETE',
    });
  }

  async getSchools(facultyId?: number): Promise<School[]> {
    const params = facultyId ? `?faculty_id=${facultyId}` : '';
    return this.request<School[]>(`/schools/${params}`);
  }

  async createSchool(school: Omit<School, 'id' | 'created_at' | 'updated_at'>): Promise<School> {
    return this.request<School>('/schools/', {
      method: 'POST',
      body: JSON.stringify(school),
    });
  }

  async updateSchool(id: number, school: Partial<School>): Promise<School> {
    return this.request<School>(`/schools/${id}`, {
      method: 'PUT',
      body: JSON.stringify(school),
    });
  }

  async deleteSchool(id: number): Promise<void> {
    return this.request<void>(`/schools/${id}`, {
      method: 'DELETE',
    });
  }

  async getDegrees(): Promise<Degree[]> {
    return this.request<Degree[]>('/degrees/');
  }

  async createDegree(degree: Omit<Degree, 'id' | 'created_at' | 'updated_at'>): Promise<Degree> {
    return this.request<Degree>('/degrees/', {
      method: 'POST',
      body: JSON.stringify(degree),
    });
  }

  async updateDegree(id: number, degree: Partial<Degree>): Promise<Degree> {
    return this.request<Degree>(`/degrees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(degree),
    });
  }

  async deleteDegree(id: number): Promise<void> {
    return this.request<void>(`/degrees/${id}`, {
      method: 'DELETE',
    });
  }

  async getDisciplines(): Promise<Discipline[]> {
    return this.request<Discipline[]>('/disciplines/');
  }

  async createDiscipline(discipline: Omit<Discipline, 'id' | 'created_at' | 'updated_at'>): Promise<Discipline> {
    return this.request<Discipline>('/disciplines/', {
      method: 'POST',
      body: JSON.stringify(discipline),
    });
  }

  async updateDiscipline(id: number, discipline: Partial<Discipline>): Promise<Discipline> {
    return this.request<Discipline>(`/disciplines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(discipline),
    });
  }

  async deleteDiscipline(id: number): Promise<void> {
    return this.request<void>(`/disciplines/${id}`, {
      method: 'DELETE',
    });
  }

  async getSubDisciplines(disciplineId?: number): Promise<SubDiscipline[]> {
    const params = disciplineId ? `?discipline_id=${disciplineId}` : '';
    return this.request<SubDiscipline[]>(`/sub-disciplines/${params}`);
  }

  async createSubDiscipline(subDiscipline: Omit<SubDiscipline, 'id' | 'created_at' | 'updated_at'>): Promise<SubDiscipline> {
    return this.request<SubDiscipline>('/sub-disciplines/', {
      method: 'POST',
      body: JSON.stringify(subDiscipline),
    });
  }

  async updateSubDiscipline(id: number, subDiscipline: Partial<SubDiscipline>): Promise<SubDiscipline> {
    return this.request<SubDiscipline>(`/sub-disciplines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(subDiscipline),
    });
  }

  async deleteSubDiscipline(id: number): Promise<void> {
    return this.request<void>(`/sub-disciplines/${id}`, {
      method: 'DELETE',
    });
  }

  async getSpecialties(subDisciplineId?: number): Promise<Specialty[]> {
    const params = subDisciplineId ? `?sub_discipline_id=${subDisciplineId}` : '';
    return this.request<Specialty[]>(`/specialties/${params}`);
  }

  async createSpecialty(specialty: Omit<Specialty, 'id' | 'created_at' | 'updated_at'>): Promise<Specialty> {
    return this.request<Specialty>('/specialties/', {
      method: 'POST',
      body: JSON.stringify(specialty),
    });
  }

  async updateSpecialty(id: number, specialty: Partial<Specialty>): Promise<Specialty> {
    return this.request<Specialty>(`/specialties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(specialty),
    });
  }

  async deleteSpecialty(id: number): Promise<void> {
    return this.request<void>(`/specialties/${id}`, {
      method: 'DELETE',
    });
  }

  // Thesis endpoints
  async searchTheses(params: SearchParams): Promise<SearchResponse> {
    const searchParams = new URLSearchParams();
    
    if (params.q) searchParams.append('q', params.q);
    if (params.sort_by) searchParams.append('sort_by', params.sort_by);
    if (params.sort_order) searchParams.append('sort_order', params.sort_order);
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.size) searchParams.append('size', params.size.toString());

    // Add filters
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (Array.isArray(value) && value.length > 0) {
          value.forEach(v => searchParams.append(key, v.toString()));
        } else if (value && !Array.isArray(value)) {
          searchParams.append(key, value.toString());
        }
      });
    }

    return this.request<SearchResponse>(`/theses/search?${searchParams.toString()}`);
  }

  async getThesis(id: number): Promise<Thesis> {
    return this.request<Thesis>(`/theses/${id}`);
  }

  async createThesis(thesis: Omit<Thesis, 'id' | 'created_at' | 'updated_at' | 'download_count' | 'view_count'>): Promise<Thesis> {
    return this.request<Thesis>('/theses/', {
      method: 'POST',
      body: JSON.stringify(thesis),
    });
  }

  async updateThesis(id: number, thesis: Partial<Thesis>): Promise<Thesis> {
    return this.request<Thesis>(`/theses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(thesis),
    });
  }

  async deleteThesis(id: number): Promise<void> {
    return this.request<void>(`/theses/${id}`, {
      method: 'DELETE',
    });
  }

  async uploadThesisFile(thesisId: number, file: File): Promise<{ file_url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/theses/${thesisId}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({ 
        detail: 'Upload failed' 
      }));
      throw new Error(error.detail);
    }

    return response.json();
  }
}

export const apiService = new ApiService();