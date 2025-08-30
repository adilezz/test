export const APP_CONFIG = {
  name: 'theses.ma',
  version: '1.0.0',
  description: 'Plateforme Marocaine des Thèses Académiques',
  contact: {
    email: 'contact@theses.ma',
    phone: '+212 5 36 50 05 05',
    address: 'Rabat, Maroc'
  }
};

export const API_ENDPOINTS = {
  // Authentication
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',
  PROFILE: '/auth/profile',
  
  // Theses
  SEARCH: '/search',
  THESES: '/theses',
  UPLOAD: '/theses',
  FEATURED: '/theses/featured',
  POPULAR: '/theses/popular',
  RECENT: '/theses/recent',
  
  // Admin
  ADMIN_STATS: '/admin/stats',
  ADMIN_THESES: '/admin/theses',
  ADMIN_USERS: '/admin/users',
  ADMIN_INSTITUTIONS: '/admin/institutions',
  ADMIN_DISCIPLINES: '/admin/disciplines'
};

export const MOROCCAN_INSTITUTIONS = [
  'Université Mohammed Premier de Oujda',
  'Université Hassan II de Casablanca',
  'Université Mohammed V de Rabat',
  'Université Cadi Ayyad de Marrakech',
  'Université Ibn Tofail de Kénitra',
  'Université Sidi Mohamed Ben Abdellah de Fès',
  'Université Hassan 1er de Settat',
  'Université Moulay Ismail de Meknès',
  'Université Abdelmalek Essaadi de Tétouan',
  'Université Sultan Moulay Slimane de Béni Mellal',
  'Université Ibn Zohr d\'Agadir',
  'Université Chouaib Doukkali d\'El Jadida',
  'École Normale Supérieure de Rabat',
  'École Mohammadia d\'Ingénieurs',
  'Institut National des Postes et Télécommunications',
  'École Nationale d\'Agriculture de Meknès'
];

export const ACADEMIC_DISCIPLINES = [
  'Médecine',
  'Pharmacie',
  'Médecine Dentaire',
  'Sciences',
  'Mathématiques',
  'Physique',
  'Chimie',
  'Biologie',
  'Informatique',
  'Géologie',
  'Économie et Gestion',
  'Lettres et Sciences Humaines',
  'Histoire',
  'Géographie',
  'Philosophie',
  'Littérature',
  'Linguistique',
  'Droit et Sciences Politiques',
  'Ingénierie et Technologie',
  'Sciences de l\'Éducation',
  'Agriculture et Vétérinaire',
  'Arts et Beaux-Arts',
  'Architecture et Urbanisme'
];

export const SUPPORTED_LANGUAGES = {
  fr: { name: 'Français', code: 'fr-FR' },
  ar: { name: 'العربية', code: 'ar-MA' },
  en: { name: 'English', code: 'en-US' },
  tzm: { name: 'Tamazight', code: 'tzm' }
};

export const FILE_UPLOAD_CONFIG = {
  maxSize: 50 * 1024 * 1024, // 50MB
  allowedTypes: ['application/pdf'],
  allowedExtensions: ['.pdf']
};

export const PAGINATION_CONFIG = {
  defaultPageSize: 20,
  pageSizeOptions: [10, 20, 50, 100]
};

export const CITATION_FORMATS = {
  APA: 'apa',
  MLA: 'mla',
  CHICAGO: 'chicago',
  BIBTEX: 'bibtex'
} as const;

export const THESIS_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  PUBLISHED: 'published',
  REJECTED: 'rejected'
} as const;

export const USER_ROLES = {
  STUDENT: 'student',
  RESEARCHER: 'researcher',
  PROFESSOR: 'professor',
  ADMIN: 'admin'
} as const;