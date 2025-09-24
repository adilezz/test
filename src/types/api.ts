// API Types based on the backend schema
export interface University {
  id: number;
  name: string;
  name_ar?: string;
  name_en?: string;
  code: string;
  city: string;
  established_year?: number;
  website?: string;
  logo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Faculty {
  id: number;
  university_id: number;
  name: string;
  name_ar?: string;
  name_en?: string;
  code: string;
  dean?: string;
  website?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  university?: University;
}

export interface School {
  id: number;
  faculty_id: number;
  name: string;
  name_ar?: string;
  name_en?: string;
  code: string;
  director?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  faculty?: Faculty;
}

export interface Degree {
  id: number;
  name: string;
  name_ar?: string;
  name_en?: string;
  level: 'bachelor' | 'master' | 'phd' | 'hdr';
  duration_years?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Discipline {
  id: number;
  name: string;
  name_ar?: string;
  name_en?: string;
  code: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubDiscipline {
  id: number;
  discipline_id: number;
  name: string;
  name_ar?: string;
  name_en?: string;
  code: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  discipline?: Discipline;
}

export interface Specialty {
  id: number;
  sub_discipline_id: number;
  name: string;
  name_ar?: string;
  name_en?: string;
  code: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sub_discipline?: SubDiscipline;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'user';
  university_id?: number;
  faculty_id?: number;
  school_id?: number;
  orcid?: string;
  phone?: string;
  bio?: string;
  avatar_url?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  university?: University;
  faculty?: Faculty;
  school?: School;
}

export interface Thesis {
  id: number;
  title: string;
  title_ar?: string;
  title_en?: string;
  author_first_name: string;
  author_last_name: string;
  author_email?: string;
  director_first_name: string;
  director_last_name: string;
  co_director_first_name?: string;
  co_director_last_name?: string;
  university_id: number;
  faculty_id: number;
  school_id?: number;
  degree_id: number;
  discipline_id: number;
  sub_discipline_id?: number;
  specialty_id?: number;
  defense_date: string;
  academic_year: string;
  language: 'fr' | 'ar' | 'en' | 'ber';
  keywords: string[];
  abstract: string;
  abstract_ar?: string;
  abstract_en?: string;
  pages_count?: number;
  file_url?: string;
  file_size?: number;
  thumbnail_url?: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'published';
  visibility: 'public' | 'restricted' | 'private';
  download_count: number;
  view_count: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  university?: University;
  faculty?: Faculty;
  school?: School;
  degree?: Degree;
  discipline?: Discipline;
  sub_discipline?: SubDiscipline;
  specialty?: Specialty;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  university_id?: number;
  faculty_id?: number;
  school_id?: number;
  orcid?: string;
  phone?: string;
  bio?: string;
}

export interface SearchFilters {
  university_ids?: number[];
  faculty_ids?: number[];
  school_ids?: number[];
  degree_ids?: number[];
  discipline_ids?: number[];
  sub_discipline_ids?: number[];
  specialty_ids?: number[];
  languages?: string[];
  academic_years?: string[];
  defense_date_from?: string;
  defense_date_to?: string;
  status?: string[];
  visibility?: string[];
}

export interface SearchParams {
  q?: string;
  filters?: SearchFilters;
  sort_by?: 'title' | 'author' | 'defense_date' | 'created_at' | 'updated_at' | 'relevance' | 'download_count' | 'view_count' | 'university' | 'faculty';
  sort_order?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

export interface SearchResponse {
  items: Thesis[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ApiError {
  detail: string;
}