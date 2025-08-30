import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  User, 
  Building, 
  Download, 
  Eye, 
  Quote, 
  Share2, 
  Heart, 
  HeartOff,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface ThesisCardProps {
  thesis: {
    id: string;
    title: string;
    author: string;
    director: string;
    institution: string;
    year: number;
    discipline: string;
    abstract: string;
    availability: 'available' | 'preparing' | 'unavailable';
    downloadCount: number;
    viewCount: number;
    thumbnail?: string;
    pages: number;
    language: string;
  };
  layout?: 'grid' | 'list';
}

export default function ThesisCard({ thesis, layout = 'grid' }: ThesisCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [showCiteModal, setShowCiteModal] = useState(false);

  const getAvailabilityIcon = () => {
    switch (thesis.availability) {
      case 'available':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'preparing':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'unavailable':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getAvailabilityText = () => {
    switch (thesis.availability) {
      case 'available':
        return 'Disponible en ligne';
      case 'preparing':
        return 'En cours de préparation';
      case 'unavailable':
        return 'Non disponible en ligne';
    }
  };

  const getAvailabilityColor = () => {
    switch (thesis.availability) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'preparing':
        return 'bg-amber-100 text-amber-800';
      case 'unavailable':
        return 'bg-red-100 text-red-800';
    }
  };

  const CitationModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Citation</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Format APA</label>
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              {thesis.author} ({thesis.year}). <em>{thesis.title}</em>. 
              Thèse de doctorat, {thesis.institution}.
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Format MLA</label>
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              {thesis.author}. "{thesis.title}." Diss. {thesis.institution}, {thesis.year}.
            </div>
          </div>
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={() => setShowCiteModal(false)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
          >
            Fermer
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200">
            Copier
          </button>
        </div>
      </div>
    </div>
  );

  if (layout === 'list') {
    return (
      <>
        <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all duration-200 group">
          <div className="flex flex-col lg:flex-row lg:items-start space-y-4 lg:space-y-0 lg:space-x-6">
            {/* Thumbnail */}
            <div className="flex-shrink-0">
              <div className="w-16 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Link
                    to={`/thesis/${thesis.id}`}
                    className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors duration-200 line-clamp-2 group-hover:text-blue-600"
                  >
                    {thesis.title}
                  </Link>
                  
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                    <span className="flex items-center space-x-1">
                      <User className="w-4 h-4" />
                      <span>{thesis.author}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{thesis.year}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Building className="w-4 h-4" />
                      <span className="truncate">{thesis.institution}</span>
                    </span>
                  </div>

                  <p className="text-gray-600 mt-2 text-sm line-clamp-2">
                    {thesis.abstract}
                  </p>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getAvailabilityColor()}`}>
                        {getAvailabilityIcon()}
                        <span>{getAvailabilityText()}</span>
                      </span>
                      <span className="text-xs text-gray-500">
                        {thesis.viewCount} vues • {thesis.downloadCount} téléchargements
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => setIsFavorite(!isFavorite)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors duration-200"
                  >
                    {isFavorite ? <Heart className="w-5 h-5 fill-current text-red-500" /> : <HeartOff className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => setShowCiteModal(true)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                  >
                    <Quote className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200">
                    <Share2 className="w-5 h-5" />
                  </button>
                  {thesis.availability === 'available' && (
                    <button className="p-2 text-gray-400 hover:text-green-600 transition-colors duration-200">
                      <Download className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        {showCiteModal && <CitationModal />}
      </>
    );
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 group">
        {/* Thumbnail */}
        <div className="aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative overflow-hidden">
          <FileText className="w-12 h-12 text-gray-400" />
          <div className="absolute top-2 right-2">
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className="p-1.5 bg-white bg-opacity-90 rounded-full shadow-sm hover:bg-opacity-100 transition-all duration-200"
            >
              {isFavorite ? 
                <Heart className="w-4 h-4 fill-current text-red-500" /> : 
                <HeartOff className="w-4 h-4 text-gray-400" />
              }
            </button>
          </div>
          <div className="absolute bottom-2 left-2">
            <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getAvailabilityColor()}`}>
              {getAvailabilityIcon()}
              <span>{getAvailabilityText()}</span>
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <Link
            to={`/thesis/${thesis.id}`}
            className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors duration-200 line-clamp-2 block mb-2 group-hover:text-blue-600"
          >
            {thesis.title}
          </Link>
          
          <div className="space-y-2 text-sm text-gray-600 mb-3">
            <div className="flex items-center space-x-1">
              <User className="w-4 h-4" />
              <span className="truncate">{thesis.author}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>{thesis.year}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Building className="w-4 h-4" />
              <span className="truncate">{thesis.institution}</span>
            </div>
          </div>

          <p className="text-gray-600 text-sm line-clamp-3 mb-4">
            {thesis.abstract}
          </p>

          <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
            <span>{thesis.viewCount} vues</span>
            <span>{thesis.pages} pages</span>
            <span>{thesis.downloadCount} téléch.</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowCiteModal(true)}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
              >
                <Quote className="w-4 h-4" />
                <span>Citer</span>
              </button>
              <button className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-all duration-200">
                <Share2 className="w-4 h-4" />
                <span>Partager</span>
              </button>
            </div>
            
            {thesis.availability === 'available' && (
              <button className="flex items-center space-x-1 px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-all duration-200 text-sm">
                <Download className="w-4 h-4" />
                <span>Télécharger</span>
              </button>
            )}
          </div>
        </div>
      </div>
      {showCiteModal && <CitationModal />}
    </>
  );
}