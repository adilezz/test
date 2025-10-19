import React, { useState, useCallback } from 'react';
import {
  BookOpen,
  Download,
  Eye,
  Calendar,
  MapPin,
  User,
  GraduationCap,
  Globe,
  FileText,
  ExternalLink,
  Heart,
  Share2,
  Bookmark,
  Quote,
  Users,
  Building2,
  Tag
} from 'lucide-react';
import { ThesisResponse, LanguageCode, ThesisStatus } from '../../types/api';
import apiService from '../../services/api';

interface EnhancedThesisCardProps {
  thesis: ThesisResponse & {
    university?: { name_fr: string; acronym?: string };
    faculty?: { name_fr: string; acronym?: string };
    department?: { name_fr: string; acronym?: string };
    degree?: { name_fr: string; level: string };
    language?: { name: string; code: string };
    authors?: Array<{ first_name: string; last_name: string; role: string }>;
    categories?: Array<{ name_fr: string; is_primary: boolean }>;
    keywords?: Array<{ word_fr: string }>;
    download_count?: number;
    view_count?: number;
    citation_count?: number;
  };
  variant?: 'default' | 'compact' | 'detailed';
  showActions?: boolean;
  onView?: (thesis: ThesisResponse) => void;
  onDownload?: (thesis: ThesisResponse) => void;
  onBookmark?: (thesis: ThesisResponse) => void;
  onShare?: (thesis: ThesisResponse) => void;
  className?: string;
}

const statusColors = {
  [ThesisStatus.DRAFT]: 'badge-neutral',
  [ThesisStatus.SUBMITTED]: 'badge-info',
  [ThesisStatus.UNDER_REVIEW]: 'badge-warning',
  [ThesisStatus.APPROVED]: 'badge-success',
  [ThesisStatus.REJECTED]: 'badge-error',
  [ThesisStatus.PUBLISHED]: 'badge-primary'
};

const statusLabels = {
  [ThesisStatus.DRAFT]: 'Brouillon',
  [ThesisStatus.SUBMITTED]: 'Soumise',
  [ThesisStatus.UNDER_REVIEW]: 'En révision',
  [ThesisStatus.APPROVED]: 'Approuvée',
  [ThesisStatus.REJECTED]: 'Rejetée',
  [ThesisStatus.PUBLISHED]: 'Publiée'
};

const languageLabels = {
  [LanguageCode.FRENCH]: 'Français',
  [LanguageCode.ARABIC]: 'العربية',
  [LanguageCode.ENGLISH]: 'English',
  [LanguageCode.SPANISH]: 'Español',
  [LanguageCode.TAMAZIGHT]: 'ⵜⴰⵎⴰⵣⵉⵖⵜ'
};

const EnhancedThesisCard: React.FC<EnhancedThesisCardProps> = ({
  thesis,
  variant = 'default',
  showActions = true,
  onView,
  onDownload,
  onBookmark,
  onShare,
  className = ''
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleDownload = useCallback(async () => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    try {
      const blob = await apiService.downloadThesis(thesis.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = thesis.file_name || `thesis-${thesis.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      onDownload?.(thesis);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  }, [thesis, isDownloading, onDownload]);

  const handleBookmark = useCallback(() => {
    setIsBookmarked(!isBookmarked);
    onBookmark?.(thesis);
  }, [isBookmarked, thesis, onBookmark]);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: thesis.title_fr,
      text: `${thesis.title_fr} - Thèse de ${thesis.authors?.[0]?.first_name} ${thesis.authors?.[0]?.last_name}`,
      url: `${window.location.origin}/thesis/${thesis.id}`
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        // Show toast notification
      }
      onShare?.(thesis);
    } catch (error) {
      console.error('Share failed:', error);
    }
  }, [thesis, onShare]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getAuthorName = () => {
    if (thesis.authors && thesis.authors.length > 0) {
      const author = thesis.authors.find(a => a.role === 'author') || thesis.authors[0];
      return `${author.first_name} ${author.last_name}`;
    }
    return 'Auteur non spécifié';
  };

  const getDirectorName = () => {
    if (thesis.authors && thesis.authors.length > 0) {
      const director = thesis.authors.find(a => a.role === 'director');
      return director ? `${director.first_name} ${director.last_name}` : null;
    }
    return null;
  };

  const getPrimaryCategory = () => {
    return thesis.categories?.find(c => c.is_primary)?.name_fr || 
           thesis.categories?.[0]?.name_fr || 
           'Non catégorisé';
  };

  if (variant === 'compact') {
    return (
      <div
        className={`card p-6 cursor-pointer group ${className} thesis-card-compact`}
        onClick={() => onView?.(thesis)}
      >
        <div className="flex space-x-4">
          <div className="flex-shrink-0">
            <div className="w-16 h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center shadow-soft group-hover:shadow-moroccan transition-all duration-300">
              <BookOpen className="w-8 h-8 text-primary-600" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-serif font-semibold text-neutral-900 line-clamp-2 group-hover:text-primary-600 transition-colors duration-300">
                  {thesis.title_fr}
                </h3>
                <p className="text-sm text-neutral-600 mt-2 font-medium">
                  {getAuthorName()}
                </p>
                <div className="flex items-center space-x-4 mt-3 text-xs text-neutral-500">
                  <span className="font-medium">{thesis.university?.acronym || thesis.university?.name_fr}</span>
                  <span>{formatDate(thesis.defense_date)}</span>
                  {thesis.download_count && (
                    <span className="flex items-center space-x-1">
                      <Download className="w-3 h-3" />
                      <span>{thesis.download_count}</span>
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-1 ml-4">
                <span className={`badge ${statusColors[thesis.status]} text-xs`}>
                  {statusLabels[thesis.status]}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`card-moroccan overflow-hidden group ${className} thesis-card-enhanced`}
    >
      {/* Thumbnail */}
      <div className="aspect-[4/3] bg-gradient-to-br from-primary-50 to-secondary-50 relative overflow-hidden">
        {!imageError && thesis.file_url ? (
          <img
            src={`${thesis.file_url}/thumbnail`}
            alt={thesis.title_fr}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-16 h-16 text-primary-400" />
          </div>
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-mountain-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
          <button
            onClick={() => onView?.(thesis)}
            className="btn-primary btn-lg shadow-elevated"
          >
            <Eye className="w-5 h-5 mr-2" />
            Voir
          </button>
        </div>

        {/* Status Badge */}
        <div className="absolute top-4 right-4">
          <span className={`badge ${statusColors[thesis.status]} text-xs shadow-soft`}>
            {statusLabels[thesis.status]}
          </span>
        </div>

        {/* Language Badge */}
        {thesis.language && (
          <div className="absolute top-4 left-4">
            <span className="badge badge-secondary text-xs flex items-center space-x-1 shadow-soft">
              <Globe className="w-3 h-3" />
              <span>{languageLabels[thesis.language.code as LanguageCode] || thesis.language.name}</span>
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Category */}
        <div className="flex items-center space-x-2 mb-4">
          <Tag className="w-4 h-4 text-secondary-600" />
          <span className="text-sm font-semibold text-secondary-600">
            {getPrimaryCategory()}
          </span>
        </div>

        {/* Title */}
        <h3 className="h5 text-neutral-900 mb-4 line-clamp-2 group-hover:text-primary-600 transition-colors duration-300">
          {thesis.title_fr}
        </h3>

        {/* Abstract */}
        {variant === 'detailed' && thesis.abstract_fr && (
          <p className="text-sm text-neutral-600 mb-4 line-clamp-3 leading-relaxed">
            {thesis.abstract_fr}
          </p>
        )}

        {/* Author & Director */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center space-x-3 text-sm text-neutral-600">
            <User className="w-4 h-4 text-primary-500" />
            <span className="font-medium">
              <strong>Auteur:</strong> {getAuthorName()}
            </span>
          </div>
          
          {getDirectorName() && (
            <div className="flex items-center space-x-3 text-sm text-neutral-600">
              <Users className="w-4 h-4 text-secondary-500" />
              <span className="font-medium">
                <strong>Directeur:</strong> {getDirectorName()}
              </span>
            </div>
          )}
        </div>

        {/* Institution */}
        <div className="space-y-2 mb-4">
          {thesis.university && (
            <div className="flex items-center space-x-3 text-sm text-neutral-600">
              <Building2 className="w-4 h-4 text-accent-500" />
              <span className="font-medium">{thesis.university.name_fr}</span>
            </div>
          )}
          
          {thesis.faculty && (
            <div className="flex items-center space-x-2 text-sm text-neutral-500 ml-7">
              <span>• {thesis.faculty.name_fr}</span>
            </div>
          )}
          
          {thesis.department && (
            <div className="flex items-center space-x-2 text-sm text-neutral-500 ml-7">
              <span>• {thesis.department.name_fr}</span>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div className="flex items-center space-x-2 text-neutral-600">
            <Calendar className="w-4 h-4 text-primary-500" />
            <span className="font-medium">{formatDate(thesis.defense_date)}</span>
          </div>
          
          {thesis.degree && (
            <div className="flex items-center space-x-2 text-neutral-600">
              <GraduationCap className="w-4 h-4 text-secondary-500" />
              <span className="font-medium">{thesis.degree.name_fr}</span>
            </div>
          )}
          
          {thesis.page_count && (
            <div className="flex items-center space-x-2 text-neutral-600">
              <FileText className="w-4 h-4 text-accent-500" />
              <span className="font-medium">{thesis.page_count} pages</span>
            </div>
          )}
        </div>

        {/* Keywords */}
        {thesis.keywords && thesis.keywords.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {thesis.keywords.slice(0, 3).map((keyword, index) => (
                <span key={index} className="badge badge-neutral text-xs">
                  {keyword.word_fr}
                </span>
              ))}
              {thesis.keywords.length > 3 && (
                <span className="badge badge-neutral text-xs">
                  +{thesis.keywords.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-neutral-500 mb-4">
          <div className="flex items-center space-x-4">
            {thesis.view_count && (
              <span className="flex items-center space-x-1">
                <Eye className="w-4 h-4 text-primary-500" />
                <span className="font-medium">{thesis.view_count.toLocaleString()}</span>
              </span>
            )}
            
            {thesis.download_count && (
              <span className="flex items-center space-x-1">
                <Download className="w-4 h-4 text-secondary-500" />
                <span className="font-medium">{thesis.download_count.toLocaleString()}</span>
              </span>
            )}
            
            {thesis.citation_count && (
              <span className="flex items-center space-x-1">
                <Quote className="w-4 h-4 text-accent-500" />
                <span className="font-medium">{thesis.citation_count.toLocaleString()}</span>
              </span>
            )}
          </div>
          
          <span className="text-xs font-medium">
            Ajoutée le {formatDate(thesis.created_at)}
          </span>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center justify-between pt-4 border-t border-primary-100">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleDownload}
                disabled={isDownloading || thesis.status !== ThesisStatus.PUBLISHED}
                className="btn-primary btn-sm"
              >
                <Download className={`w-4 h-4 mr-1 ${isDownloading ? 'animate-spin' : ''}`} />
                Télécharger
              </button>
              
              <button
                onClick={() => onView?.(thesis)}
                className="btn-secondary btn-sm"
              >
                <Eye className="w-4 h-4 mr-1" />
                Détails
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleBookmark}
                className={`p-2 rounded-xl transition-all duration-300 ${
                  isBookmarked 
                    ? 'text-accent-600 bg-accent-50 hover:bg-accent-100 shadow-soft' 
                    : 'text-neutral-400 hover:text-accent-600 hover:bg-accent-50'
                }`}
                title="Ajouter aux favoris"
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </button>
              
              <button
                onClick={handleShare}
                className="p-2 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-300"
                title="Partager"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(EnhancedThesisCard);