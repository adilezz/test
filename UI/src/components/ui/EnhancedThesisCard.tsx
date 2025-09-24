import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
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
    keywords?: Array<{ keyword_fr: string }>;
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
  [ThesisStatus.DRAFT]: 'bg-gray-100 text-gray-800',
  [ThesisStatus.SUBMITTED]: 'bg-blue-100 text-blue-800',
  [ThesisStatus.UNDER_REVIEW]: 'bg-yellow-100 text-yellow-800',
  [ThesisStatus.APPROVED]: 'bg-green-100 text-green-800',
  [ThesisStatus.REJECTED]: 'bg-red-100 text-red-800',
  [ThesisStatus.PUBLISHED]: 'bg-primary-100 text-primary-800'
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
  [LanguageCode.TAMAZIGHT]: 'Tamazight'
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
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        className={`card p-4 cursor-pointer group ${className}`}
        onClick={() => onView?.(thesis)}
      >
        <div className="flex space-x-4">
          <div className="flex-shrink-0">
            <div className="w-16 h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-primary-600" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-primary-600 transition-colors duration-200">
                  {thesis.title_fr}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {getAuthorName()}
                </p>
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span>{thesis.university?.acronym || thesis.university?.name_fr}</span>
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
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.1)' }}
      className={`card overflow-hidden group ${className}`}
    >
      {/* Thumbnail */}
      <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
        {!imageError && thesis.file_url ? (
          <img
            src={`${thesis.file_url}/thumbnail`}
            alt={thesis.title_fr}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-16 h-16 text-gray-400" />
          </div>
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <button
            onClick={() => onView?.(thesis)}
            className="btn-primary"
          >
            <Eye className="w-4 h-4 mr-2" />
            Voir
          </button>
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span className={`badge ${statusColors[thesis.status]} text-xs`}>
            {statusLabels[thesis.status]}
          </span>
        </div>

        {/* Language Badge */}
        {thesis.language && (
          <div className="absolute top-3 left-3">
            <span className="badge badge-secondary text-xs flex items-center space-x-1">
              <Globe className="w-3 h-3" />
              <span>{languageLabels[thesis.language.code as LanguageCode] || thesis.language.name}</span>
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Category */}
        <div className="flex items-center space-x-2 mb-3">
          <Tag className="w-4 h-4 text-secondary-600" />
          <span className="text-sm font-medium text-secondary-600">
            {getPrimaryCategory()}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2 group-hover:text-primary-600 transition-colors duration-200">
          {thesis.title_fr}
        </h3>

        {/* Abstract */}
        {variant === 'detailed' && thesis.abstract_fr && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-3">
            {thesis.abstract_fr}
          </p>
        )}

        {/* Author & Director */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <User className="w-4 h-4" />
            <span>
              <strong>Auteur:</strong> {getAuthorName()}
            </span>
          </div>
          
          {getDirectorName() && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>
                <strong>Directeur:</strong> {getDirectorName()}
              </span>
            </div>
          )}
        </div>

        {/* Institution */}
        <div className="space-y-1 mb-4">
          {thesis.university && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Building2 className="w-4 h-4" />
              <span>{thesis.university.name_fr}</span>
            </div>
          )}
          
          {thesis.faculty && (
            <div className="flex items-center space-x-2 text-sm text-gray-500 ml-6">
              <span>• {thesis.faculty.name_fr}</span>
            </div>
          )}
          
          {thesis.department && (
            <div className="flex items-center space-x-2 text-sm text-gray-500 ml-6">
              <span>• {thesis.department.name_fr}</span>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div className="flex items-center space-x-2 text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(thesis.defense_date)}</span>
          </div>
          
          {thesis.degree && (
            <div className="flex items-center space-x-2 text-gray-600">
              <GraduationCap className="w-4 h-4" />
              <span>{thesis.degree.name_fr}</span>
            </div>
          )}
          
          {thesis.page_count && (
            <div className="flex items-center space-x-2 text-gray-600">
              <FileText className="w-4 h-4" />
              <span>{thesis.page_count} pages</span>
            </div>
          )}
        </div>

        {/* Keywords */}
        {thesis.keywords && thesis.keywords.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {thesis.keywords.slice(0, 3).map((keyword, index) => (
                <span key={index} className="badge badge-gray text-xs">
                  {keyword.keyword_fr}
                </span>
              ))}
              {thesis.keywords.length > 3 && (
                <span className="badge badge-gray text-xs">
                  +{thesis.keywords.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center space-x-4">
            {thesis.view_count && (
              <span className="flex items-center space-x-1">
                <Eye className="w-4 h-4" />
                <span>{thesis.view_count.toLocaleString()}</span>
              </span>
            )}
            
            {thesis.download_count && (
              <span className="flex items-center space-x-1">
                <Download className="w-4 h-4" />
                <span>{thesis.download_count.toLocaleString()}</span>
              </span>
            )}
            
            {thesis.citation_count && (
              <span className="flex items-center space-x-1">
                <Quote className="w-4 h-4" />
                <span>{thesis.citation_count.toLocaleString()}</span>
              </span>
            )}
          </div>
          
          <span className="text-xs">
            Ajoutée le {formatDate(thesis.created_at)}
          </span>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownload}
                disabled={isDownloading || thesis.status !== ThesisStatus.PUBLISHED}
                className="btn-primary text-sm"
              >
                {isDownloading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Download className="w-4 h-4 mr-1" />
                  </motion.div>
                ) : (
                  <Download className="w-4 h-4 mr-1" />
                )}
                Télécharger
              </button>
              
              <button
                onClick={() => onView?.(thesis)}
                className="btn-secondary text-sm"
              >
                <Eye className="w-4 h-4 mr-1" />
                Détails
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleBookmark}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  isBookmarked 
                    ? 'text-accent-600 bg-accent-50 hover:bg-accent-100' 
                    : 'text-gray-400 hover:text-accent-600 hover:bg-accent-50'
                }`}
                title="Ajouter aux favoris"
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </button>
              
              <button
                onClick={handleShare}
                className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors duration-200"
                title="Partager"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default EnhancedThesisCard;