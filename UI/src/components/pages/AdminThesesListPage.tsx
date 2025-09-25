import React, { useState, useEffect } from 'react';
import { 
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  FileText,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  User,
  Building2,
  MoreHorizontal
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiService } from '../../services/api';
import AdminHeader from '../layout/AdminHeader';
import { 
  ThesisResponse,
  PaginatedResponse,
  ThesisStatus,
  SearchRequest,
  SortField,
  SortOrder
} from '../../types/api';

interface FilterState {
  status: ThesisStatus | '';
  university_id: string;
  year_from: string;
  year_to: string;
  language_id: string;
}

export default function AdminThesesListPage() {
  const [theses, setTheses] = useState<ThesisResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTheses, setSelectedTheses] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    university_id: '',
    year_from: '',
    year_to: '',
    language_id: ''
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 20;

  useEffect(() => {
    loadTheses();
  }, [currentPage, searchTerm, filters]);

  const loadTheses = async () => {
    setLoading(true);
    try {
      // Convert filters to API format
      const apiFilters: Partial<SearchRequest> = {};
      
      if (filters.status && filters.status !== '' as any) {
        apiFilters.status = filters.status as ThesisStatus;
      }
      if (filters.university_id) {
        apiFilters.university_id = filters.university_id;
      }
      if (filters.language_id) {
        apiFilters.language_id = filters.language_id;
      }
      if (filters.year_from) {
        const year = parseInt(filters.year_from);
        if (!isNaN(year)) apiFilters.year_from = year;
      }
      if (filters.year_to) {
        const year = parseInt(filters.year_to);
        if (!isNaN(year)) apiFilters.year_to = year;
      }

      const searchParams: Partial<SearchRequest> = {
        q: searchTerm || undefined,
        page: currentPage,
        limit: itemsPerPage,
        sort_field: SortField.CREATED_AT,
        sort_order: SortOrder.DESC,
        ...apiFilters
      };

      // Remove empty filters
      Object.keys(searchParams).forEach(key => {
        if (!searchParams[key as keyof SearchRequest]) {
          delete searchParams[key as keyof SearchRequest];
        }
      });

      const response = await apiService.getTheses(searchParams);
      setTheses(response.data);
      setTotalPages(response.meta.pages);
      setTotalItems(response.meta.total);
    } catch (error) {
      console.error('Error loading theses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiService.deleteThesis(id);
      loadTheses();
    } catch (error) {
      console.error('Error deleting thesis:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTheses.length === 0) return;
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedTheses.length} thèse${selectedTheses.length > 1 ? 's' : ''} ?`)) {
      return;
    }

    try {
      await Promise.all(selectedTheses.map(id => apiService.deleteThesis(id)));
      setSelectedTheses([]);
      loadTheses();
    } catch (error) {
      console.error('Error bulk deleting theses:', error);
    }
  };

  const toggleThesisSelection = (id: string) => {
    setSelectedTheses(prev => 
      prev.includes(id) 
        ? prev.filter(thesisId => thesisId !== id)
        : [...prev, id]
    );
  };

  const selectAllTheses = () => {
    setSelectedTheses(theses.map(t => t.id));
  };

  const deselectAllTheses = () => {
    setSelectedTheses([]);
  };

  const getStatusBadge = (status: ThesisStatus) => {
    const badges = {
      [ThesisStatus.DRAFT]: { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'Brouillon' },
      [ThesisStatus.SUBMITTED]: { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'Soumise' },
      [ThesisStatus.UNDER_REVIEW]: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle, label: 'En révision' },
      [ThesisStatus.APPROVED]: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Approuvée' },
      [ThesisStatus.PUBLISHED]: { color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle, label: 'Publiée' },
      [ThesisStatus.REJECTED]: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Rejetée' }
    };

    const badge = badges[status];
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {badge.label}
      </span>
    );
  };

  if (loading && currentPage === 1) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestion des Thèses</h1>
              <p className="text-gray-600 mt-2">
                Administrer et valider les thèses du système
              </p>
            </div>
            <Link
              to="/admin/theses/new"
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Thèse</span>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <FileText className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Thèses</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {totalItems.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                <Clock className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">En révision</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {theses.filter(t => t.status === ThesisStatus.UNDER_REVIEW).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Publiées</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {theses.filter(t => t.status === ThesisStatus.PUBLISHED).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 text-red-600">
                <XCircle className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rejetées</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {theses.filter(t => t.status === ThesisStatus.REJECTED).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher des thèses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Filter className="w-4 h-4" />
                <span>Filtres</span>
              </button>
            </div>

            {selectedTheses.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedTheses.length} sélectionnée{selectedTheses.length > 1 ? 's' : ''}
                </span>
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center space-x-1 text-sm text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Supprimer</span>
                </button>
                <button
                  onClick={deselectAllTheses}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Désélectionner tout
                </button>
              </div>
            )}
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value as ThesisStatus | '' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Tous les statuts</option>
                    <option value={ThesisStatus.DRAFT}>Brouillon</option>
                    <option value={ThesisStatus.SUBMITTED}>Soumise</option>
                    <option value={ThesisStatus.UNDER_REVIEW}>En révision</option>
                    <option value={ThesisStatus.APPROVED}>Approuvée</option>
                    <option value={ThesisStatus.PUBLISHED}>Publiée</option>
                    <option value={ThesisStatus.REJECTED}>Rejetée</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Année (de)</label>
                  <input
                    type="number"
                    value={filters.year_from}
                    onChange={(e) => setFilters({ ...filters, year_from: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    min="1980"
                    max="2025"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Année (à)</label>
                  <input
                    type="number"
                    value={filters.year_to}
                    onChange={(e) => setFilters({ ...filters, year_to: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    min="1980"
                    max="2025"
                  />
                </div>

                <div className="md:col-span-2 flex items-end space-x-2">
                  <button
                    onClick={() => setFilters({ status: '', university_id: '', year_from: '', year_to: '', language_id: '' })}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
                  >
                    Réinitialiser
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Bulk actions */}
          {theses.length > 0 && (
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedTheses.length === theses.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          selectAllTheses();
                        } else {
                          deselectAllTheses();
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Sélectionner tout ({theses.length})
                    </span>
                  </label>
                </div>
                <div className="text-sm text-gray-600">
                  Page {currentPage} sur {totalPages} • {totalItems} thèse{totalItems > 1 ? 's' : ''} au total
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thèse
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date de soutenance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Créée le
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {theses.map((thesis) => (
                  <tr key={thesis.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedTheses.includes(thesis.id)}
                          onChange={() => toggleThesisSelection(thesis.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 line-clamp-2">
                            {thesis.title_fr}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {thesis.submitted_by && (
                              <div className="flex items-center space-x-1">
                                <User className="w-3 h-3" />
                                <span>Par {thesis.submitted_by}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(thesis.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{new Date(thesis.defense_date).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(thesis.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/thesis/${thesis.id}`}
                          className="text-gray-400 hover:text-gray-600"
                          title="Voir les détails"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/admin/theses/${thesis.id}`}
                          className="text-blue-600 hover:text-blue-900"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => {
                            // Download thesis
                            apiService.downloadThesis(thesis.id).then(blob => {
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${thesis.file_name || 'thesis.pdf'}`;
                              a.click();
                              URL.revokeObjectURL(url);
                            });
                          }}
                          className="text-green-600 hover:text-green-900"
                          title="Télécharger"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Êtes-vous sûr de vouloir supprimer cette thèse ?')) {
                              handleDelete(thesis.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {theses.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">
                  {searchTerm || Object.values(filters).some(f => f) 
                    ? 'Aucune thèse trouvée pour ces critères' 
                    : 'Aucune thèse trouvée'}
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Précédent
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Suivant
                  </button>
                </div>

                <div className="text-sm text-gray-600">
                  {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalItems)} sur {totalItems}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}