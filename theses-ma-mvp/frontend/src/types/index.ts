export interface User {
  id: string;
  email: string;
  name: string;
  institution: string;
  role: 'student' | 'researcher' | 'professor' | 'admin';
  faculty?: string;
  orcid?: string;
  avatar?: string;
  createdAt: string;
  isVerified: boolean;
}

export interface Thesis {
  id: string;
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
  availability: 'available' | 'preparing' | 'unavailable';
  downloadCount: number;
  viewCount: number;
  citationCount: number;
  pages: number;
  fileUrl?: string;
  thumbnailUrl?: string;
  status: 'pending' | 'approved' | 'rejected' | 'published';
  submittedBy: string;
  submittedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  juryCo1?: string;
  juryCo2?: string;
  rating?: number;
  reviewCount?: number;
}

export interface SearchFilters {
  discipline: string[];
  institution: string[];
  language: string[];
  availability: string[];
  dateRange: { start: string; end: string };
  author: string;
  director: string;
}

export interface SearchResult {
  results: Thesis[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Institution {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  city: string;
  type: 'university' | 'school' | 'institute';
  isActive: boolean;
}

export interface Discipline {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  parentId?: string;
  isActive: boolean;
}

export interface AdminStats {
  totalTheses: number;
  totalUsers: number;
  totalInstitutions: number;
  totalDisciplines: number;
  pendingTheses: number;
  monthlyUploads: number;
  monthlyDownloads: number;
  topInstitutions: Array<{ name: string; count: number }>;
  topDisciplines: Array<{ name: string; count: number }>;
}