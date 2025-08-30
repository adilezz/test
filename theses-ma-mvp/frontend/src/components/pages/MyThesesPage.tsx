import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Plus, 
  Eye, 
  Download, 
  Edit, 
  Trash2,
  Filter,
  Search,
  Calendar,
  User,
  Building
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { thesesService } from '../../services/theses';
import { Thesis } from '../../types';
import toast from 'react-hot-toast';

export default function MyThesesPage() {
  const { user } = useAuth();
  const [theses, setTheses] = useState<Thesis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadTheses = async () => {
      if (user) {
        try {
          const userTheses = await thesesService.getUserTheses(user.id);
          setTheses(userTheses);
        } catch (error) {
          console.error('Error loading theses:', error);
          toast.error('Erreur lors du chargement des thèses');
        } finally {
          setLoading(false);
        }
      }
    };

    loadTheses();
  }, [user]);

  const statusOptions = [
    { value: 'all', label: 'Toutes', count: theses.length },
    { value: 'published', label: 'Publiées', count: theses.filter(t => t.status === 'published').length },
    { value: 'pending', label: 'En attente', count: theses.filter(t => t.status === 'pending').length },
    { value: 'approved', label: 'Approuvées', count: theses.filter(t => t.status === 'approved').length },
    { value: 'rejected', label: 'Rejetées', count: theses.filter(t => t.status === 'rejected').length }
  ];

  const filteredTheses = theses.filter(thesis => {
    const matchesStatus = selectedStatus === 'all' || thesis.status === selectedStatus;
    const matchesSearch = thesis.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         thesis.discipline.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'published':
        return { color: 'bg-green-100 text-green-800', label: 'Publiée' };
      case 'pending':
        return { color: 'bg-amber-100 text-amber-800', label: 'En attente' };
      case 'approved':
        return { color: 'bg-blue-100 text-blue-800', label: 'Approuvée' };
      case 'rejected':
        return { color: 'bg-red-100 text-red-800', label: 'Rejetée' };
      default:
        return { color: 'bg-gray-100 text-gray-800', label: 'Brouillon' };
    }
  };

  const handleDownload = async (thesis: Thesis) => {
    if (thesis.availability !== 'available') {
      toast.error('Cette thèse n\'est pas disponible au téléchargement');
      return;
    }

    try {
      toast.loading('Préparation du téléchargement...', { id: 'download' });
      const downloadUrl = await thesesService.downloadThesis(thesis.id);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${thesis.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Téléchargement commencé', { id: 'download' });
    } catch (error) {
      toast.error('Erreur lors du téléchargement', { id: 'download' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes thèses</h1>
            <p className="text-gray-600">
              Gérez vos publications et suivez leurs performances
            </p>
          </div>
          <Link
            to="/upload"
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Plus className="w-5 h-5" />
            <span>Nouvelle thèse</span>
          </Link>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total', value: theses.length, icon: BookOpen, color: 'text-blue-600' },
            { label: 'Publiées', value: theses.filter(t => t.status === 'published').length, icon: Eye, color: 'text-green-600' },
            { label: 'En attente', value: theses.filter(t => t.status === 'pending').length, icon: Calendar, color: 'text-amber-600' },
            { label: 'Vues totales', value: theses.reduce((sum, t) => sum + t.viewCount, 0).toLocaleString(), icon: TrendingUp, color: 'text-purple-600' }
          ].map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center space-x-3">
                  <IconComponent className={`w-8 h-8 ${stat.color}`} />
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher dans mes thèses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.count})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Theses List */}
        <div className="space-y-4">
          {filteredTheses.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || selectedStatus !== 'all' ? 'Aucune thèse trouvée' : 'Aucune thèse publiée'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || selectedStatus !== 'all' ? 
                  'Modifiez vos critères de recherche' : 
                  'Commencez par déposer votre première thèse'}
              </p>
              {(!searchQuery && selectedStatus === 'all') && (
                <Link
                  to="/upload"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Déposer une thèse
                </Link>
              )}
            </div>
          ) : (
            filteredTheses.map((thesis) => {
              const statusInfo = getStatusInfo(thesis.status);
              return (
                <div key={thesis.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <Link
                            to={`/thesis/${thesis.id}`}
                            className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors duration-200 line-clamp-2 block mb-2"
                          >
                            {thesis.title}
                          </Link>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{thesis.year}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Building className="w-4 h-4" />
                              <span>{thesis.discipline}</span>
                            </span>
                            <span>{thesis.viewCount} vues</span>
                            <span>{thesis.downloadCount} téléchargements</span>
                            <span>{thesis.citationCount} citations</span>
                          </div>

                          <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                            {thesis.abstract}
                          </p>

                          <div className="flex items-center space-x-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                            <span className="text-xs text-gray-500">
                              Soumise le {new Date(thesis.submittedAt).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      <Link
                        to={`/thesis/${thesis.id}`}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                        title="Voir la thèse"
                      >
                        <Eye className="w-5 h-5" />
                      </Link>
                      {thesis.availability === 'available' && (
                        <button
                          onClick={() => handleDownload(thesis)}
                          className="p-2 text-gray-400 hover:text-green-600 transition-colors duration-200"
                          title="Télécharger"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                        title="Modifier"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors duration-200"
                        title="Supprimer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}