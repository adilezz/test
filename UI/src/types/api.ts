// API Types matching the backend Python models exactly

// Enums from main.py
export enum UserRole {
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
  USER = 'user'
}

export enum LanguageCode {
  FRENCH = 'fr',
  ARABIC = 'ar',
  ENGLISH = 'en',
  BERBER = 'ber'
}

export enum GeographicLevel {
  COUNTRY = 'country',
  REGION = 'region', 
  PROVINCE = 'province',
  CITY = 'city'
}

export enum ThesisStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PUBLISHED = 'published'
}

export enum AcademicRole {
  AUTHOR = 'author',
  DIRECTOR = 'director',
  CO_DIRECTOR = 'co_director',
  JURY_MEMBER = 'jury_member',
  JURY_PRESIDENT = 'jury_president',
  RAPPORTEUR = 'rapporteur'
}

export enum SortField {
  CREATED_AT = 'created_at',
  UPDATED_AT = 'updated_at',
  TITLE = 'title',
  AUTHOR = 'author',
  DEFENSE_DATE = 'defense_date',
  UNIVERSITY = 'university'
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

// Base Response Types
export interface BaseResponse {
  success: boolean;
  message?: string;
  timestamp: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PaginatedResponse extends BaseResponse {
  data: any[];
  meta: PaginationMeta;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

// Authentication Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse extends BaseResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserResponse;
}

export interface TokenRefreshRequest {
  refresh_token: string;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

// User Types
export interface UserBase {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  title: string;
  phone?: string;
  language: LanguageCode;
  timezone: string;
}

export interface UserCreate extends UserBase {
  password: string;
  university_id?: string;
  faculty_id?: string;
  department_id?: string;
  school_id?: string;
  role: UserRole;
}

export interface UserUpdate {
  first_name?: string;
  last_name?: string;
  title?: string;
  phone?: string;
  language?: LanguageCode;
  timezone?: string;
  university_id?: string;
  faculty_id?: string;
  department_id?: string;
  school_id?: string;
}

export interface UserResponse extends UserBase {
  id: string;
  role: UserRole;
  email_verified: boolean;
  is_active: boolean;
  university_id?: string;
  faculty_id?: string;
  department_id?: string;
  school_id?: string;
  created_at: string;
  updated_at: string;
}

// Geographic Entity Types
export interface GeographicEntityBase {
  name_fr: string;
  name_en?: string;
  name_ar?: string;
  parent_id?: string;
  level: GeographicLevel;
  code?: string;
  latitude?: number;
  longitude?: number;
}

export interface GeographicEntityCreate extends GeographicEntityBase {}

export interface GeographicEntityUpdate {
  name_fr?: string;
  name_en?: string;
  name_ar?: string;
  parent_id?: string;
  level?: GeographicLevel;
  code?: string;
  latitude?: number;
  longitude?: number;
}

export interface GeographicEntityResponse extends GeographicEntityBase {
  id: string;
  created_at: string;
  updated_at: string;
}

// University Types
export interface UniversityBase {
  name_fr: string;
  name_en?: string;
  name_ar?: string;
  acronym?: string;
  geographic_entities_id?: string;
}

export interface UniversityCreate extends UniversityBase {}

export interface UniversityUpdate {
  name_fr?: string;
  name_en?: string;
  name_ar?: string;
  acronym?: string;
  geographic_entities_id?: string;
}

export interface UniversityResponse extends UniversityBase {
  id: string;
  created_at: string;
  updated_at: string;
}

// Faculty Types
export interface FacultyBase {
  university_id: string;
  name_fr: string;
  name_en?: string;
  name_ar?: string;
  acronym?: string;
}

export interface FacultyCreate extends FacultyBase {}

export interface FacultyUpdate {
  university_id?: string;
  name_fr?: string;
  name_en?: string;
  name_ar?: string;
  acronym?: string;
}

export interface FacultyResponse extends FacultyBase {
  id: string;
  created_at: string;
  updated_at: string;
}

// School Types
export interface SchoolBase {
  name_fr: string;
  name_en?: string;
  name_ar?: string;
  acronym?: string;
  parent_university_id?: string;
  parent_school_id?: string;
}

export interface SchoolCreate extends SchoolBase {}

export interface SchoolUpdate {
  name_fr?: string;
  name_en?: string;
  name_ar?: string;
  acronym?: string;
  parent_university_id?: string;
  parent_school_id?: string;
}

export interface SchoolResponse extends SchoolBase {
  id: string;
  created_at: string;
  updated_at: string;
}

// Department Types
export interface DepartmentBase {
  faculty_id?: string;
  school_id?: string;
  name_fr: string;
  name_en?: string;
  name_ar?: string;
  acronym?: string;
}

export interface DepartmentCreate extends DepartmentBase {}

export interface DepartmentUpdate {
  faculty_id?: string;
  school_id?: string;
  name_fr?: string;
  name_en?: string;
  name_ar?: string;
  acronym?: string;
}

export interface DepartmentResponse extends DepartmentBase {
  id: string;
  created_at: string;
  updated_at: string;
}

// Category Types
export interface CategoryBase {
  parent_id?: string;
  name_fr: string;
  name_en?: string;
  name_ar?: string;
  description?: string;
  level: number;
}

export interface CategoryCreate extends CategoryBase {}

export interface CategoryUpdate {
  parent_id?: string;
  name_fr?: string;
  name_en?: string;
  name_ar?: string;
  description?: string;
  level?: number;
}

export interface CategoryResponse extends CategoryBase {
  id: string;
  created_at: string;
  updated_at: string;
}

// Keyword Types
export interface KeywordBase {
  parent_keyword_id?: string;
  keyword_fr: string;
  keyword_en?: string;
  keyword_ar?: string;
  category_id?: string;
}

export interface KeywordCreate extends KeywordBase {}

export interface KeywordUpdate {
  parent_keyword_id?: string;
  keyword_fr?: string;
  keyword_en?: string;
  keyword_ar?: string;
  category_id?: string;
}

export interface KeywordResponse extends KeywordBase {
  id: string;
  created_at: string;
  updated_at: string;
}

// Academic Person Types
export interface AcademicPersonBase {
  complete_name_fr?: string;
  complete_name_ar?: string;
  first_name_fr: string;
  last_name_fr: string;
  first_name_ar?: string;
  last_name_ar?: string;
  title?: string;
  university_id?: string;
  faculty_id?: string;
  school_id?: string;
  external_institution_name?: string;
  external_institution_country?: string;
  external_institution_type?: string;
  user_id?: string;
}

export interface AcademicPersonCreate extends AcademicPersonBase {}

export interface AcademicPersonUpdate {
  complete_name_fr?: string;
  complete_name_ar?: string;
  first_name_fr?: string;
  last_name_fr?: string;
  first_name_ar?: string;
  last_name_ar?: string;
  title?: string;
  university_id?: string;
  faculty_id?: string;
  school_id?: string;
  external_institution_name?: string;
  external_institution_country?: string;
  external_institution_type?: string;
  user_id?: string;
}

export interface AcademicPersonResponse extends AcademicPersonBase {
  id: string;
  created_at: string;
  updated_at: string;
}

// Degree Types (matching backend API)
export enum DegreeType {
  DOCTORATE = 'doctorate',
  MEDICAL_DOCTORATE = 'medical doctorate',
  MASTER = 'master'
}

export enum DegreeCategory {
  RESEARCH = 'research',
  PROFESSIONAL = 'professional',
  HONORARY = 'honorary',
  JOINT = 'joint',
  INTERNATIONAL = 'international'
}

export interface DegreeBase {
  name_en: string;
  name_fr: string;
  name_ar: string;
  abbreviation: string;
  type: DegreeType | string;
  category?: DegreeCategory | string | null;
}

export interface DegreeCreate extends DegreeBase {}

export interface DegreeUpdate {
  name_en?: string;
  name_fr?: string;
  name_ar?: string;
  abbreviation?: string;
  type?: DegreeType | string;
  category?: DegreeCategory | string | null;
}

export interface DegreeResponse extends DegreeBase {
  id: string;
  created_at: string;
  updated_at: string;
}

// Language Types
export interface LanguageBase {
  name: string;
  code: string;
  native_name?: string;
  is_rtl: boolean;
}

export interface LanguageCreate extends LanguageBase {}

export interface LanguageUpdate {
  name?: string;
  code?: string;
  native_name?: string;
  is_rtl?: boolean;
}

export interface LanguageResponse extends LanguageBase {
  id: string;
  created_at: string;
  updated_at: string;
}

// Thesis Types
export interface ThesisBase {
  title_fr: string;
  title_en?: string;
  title_ar?: string;
  abstract_fr: string;
  abstract_en?: string;
  abstract_ar?: string;
  university_id?: string;
  faculty_id?: string;
  school_id?: string;
  department_id?: string;
  degree_id?: string;
  thesis_number?: string;
  study_location_id?: string;
  defense_date: string; // ISO date string
  language_id: string;
  secondary_language_ids?: string[];
  page_count?: number;
  status: ThesisStatus;
}

export interface ThesisCreate extends ThesisBase {
  file_id: string;
}

export interface ThesisUpdate {
  title_fr?: string;
  title_en?: string;
  title_ar?: string;
  abstract_fr?: string;
  abstract_en?: string;
  abstract_ar?: string;
  university_id?: string;
  faculty_id?: string;
  school_id?: string;
  department_id?: string;
  degree_id?: string;
  thesis_number?: string;
  study_location_id?: string;
  defense_date?: string;
  language_id?: string;
  secondary_language_ids?: string[];
  page_count?: number;
  status?: ThesisStatus;
  rejection_reason?: string;
}

export interface ThesisResponse extends ThesisBase {
  id: string;
  file_url: string;
  file_name: string;
  submitted_by?: string;
  extraction_job_id: string;
  created_at: string;
  updated_at: string;
}

// Thesis Relationship Types
export interface ThesisAcademicPersonBase {
  thesis_id: string;
  person_id: string;
  role: AcademicRole;
  faculty_id?: string;
  is_external: boolean;
  external_institution_name?: string;
}

export interface ThesisAcademicPersonCreate extends ThesisAcademicPersonBase {}

export interface ThesisAcademicPersonResponse extends ThesisAcademicPersonBase {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface ThesisCategoryBase {
  thesis_id: string;
  category_id: string;
  is_primary: boolean;
}

export interface ThesisCategoryCreate extends ThesisCategoryBase {}

export interface ThesisCategoryResponse extends ThesisCategoryBase {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface ThesisKeywordBase {
  thesis_id: string;
  keyword_id: string;
  keyword_position?: number;
}

export interface ThesisKeywordCreate extends ThesisKeywordBase {}

export interface ThesisKeywordResponse extends ThesisKeywordBase {
  id: string;
  created_at: string;
  updated_at: string;
}

// Search Types
export interface SearchRequest {
  q?: string;
  title?: string;
  author?: string;
  abstract?: string;
  keywords?: string;
  university_id?: string;
  faculty_id?: string;
  department_id?: string;
  category_id?: string;
  degree_id?: string;
  language_id?: string;
  year_from?: number;
  year_to?: number;
  defense_date_from?: string;
  defense_date_to?: string;
  page_count_min?: number;
  page_count_max?: number;
  sort_field: SortField;
  sort_order: SortOrder;
  page: number;
  limit: number;
}

export interface FileUploadResponse extends BaseResponse {
  file_id: string;
  original_filename: string;
  temp_filename: string;
  file_size: number;
  file_hash: string;
  extraction_job_id: string;
}

export interface StatisticsResponse {
  total_theses: number;
  total_universities: number;
  total_faculties: number;
  total_authors: number;
  recent_theses: any[];
  popular_categories: any[];
  top_universities: any[];
}

// Tree structure types for hierarchical data
export interface TreeNodeData {
  id: string;
  name_fr: string;
  name_en?: string;
  name_ar?: string;
  acronym?: string;
  thesis_count?: number;
  theses?: any[];
  children?: TreeNodeData[];
}