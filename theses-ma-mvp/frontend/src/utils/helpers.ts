import { SUPPORTED_LANGUAGES, THESIS_STATUS, USER_ROLES } from './constants';

export const formatDate = (date: string | Date, locale: string = 'fr-FR'): string => {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('fr-FR').format(num);
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères');
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une lettre minuscule');
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une lettre majuscule');
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateORCID = (orcid: string): boolean => {
  const orcidRegex = /^(\d{4}-\d{4}-\d{4}-\d{3}[0-9X])$/;
  return orcidRegex.test(orcid);
};

export const getLanguageName = (code: string): string => {
  return SUPPORTED_LANGUAGES[code as keyof typeof SUPPORTED_LANGUAGES]?.name || code;
};

export const getStatusLabel = (status: string): string => {
  switch (status) {
    case THESIS_STATUS.DRAFT: return 'Brouillon';
    case THESIS_STATUS.PENDING: return 'En attente';
    case THESIS_STATUS.APPROVED: return 'Approuvée';
    case THESIS_STATUS.PUBLISHED: return 'Publiée';
    case THESIS_STATUS.REJECTED: return 'Rejetée';
    default: return status;
  }
};

export const getRoleLabel = (role: string): string => {
  switch (role) {
    case USER_ROLES.STUDENT: return 'Étudiant';
    case USER_ROLES.RESEARCHER: return 'Chercheur';
    case USER_ROLES.PROFESSOR: return 'Professeur';
    case USER_ROLES.ADMIN: return 'Administrateur';
    default: return role;
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  }
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const generateCitation = (
  thesis: any,
  format: 'apa' | 'mla' | 'chicago' | 'bibtex'
): string => {
  switch (format) {
    case 'apa':
      return `${thesis.author} (${thesis.year}). ${thesis.title} [Thèse de doctorat, ${thesis.institution}]. Repository theses.ma. ${window.location.origin}/thesis/${thesis.id}`;
    
    case 'mla':
      return `${thesis.author}. "${thesis.title}." Dissertation, ${thesis.institution}, ${thesis.year}.`;
    
    case 'chicago':
      return `${thesis.author}. "${thesis.title}." PhD diss., ${thesis.institution}, ${thesis.year}.`;
    
    case 'bibtex':
      const authorKey = thesis.author.split(' ').join('').toLowerCase();
      return `@phdthesis{${authorKey}${thesis.year},
  title={${thesis.title}},
  author={${thesis.author}},
  year={${thesis.year}},
  school={${thesis.institution}},
  url={${window.location.origin}/thesis/${thesis.id}}
}`;
    
    default:
      return '';
  }
};