import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  Eye,
  Download,
  Check,
  X,
  MoreHorizontal,
  Calendar,
  User,
  Building,
  FileText,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { adminService } from '../../services/admin';
import { Thesis } from '../../types';
import toast from 'react-hot-toast';

export default function AdminThesesPage() {
  const [theses, setTheses] = useState<Thesis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('submittedAt_desc');
  const [selectedTheses, setSelectedTheses] = useState<string[]>([]);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadTheses();
  }, [selectedStatus, searchQuery, sortBy]);

  const loadTheses = async () => {
    setLoading(true);
    try {
      const params = {
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        search: searchQuery || undefined,
        sortBy
      };
      const result = await adminService.getTheses(params);
      setTheses(result.results);
    } catch (error) {
      console.error('Error loading theses:', error);
      toast.error('Erreur lors du chargement des thèses');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await adminService.approveThesis(id);
      toast.success('Thèse approuvée avec succès');
      loadTheses();
    } catch (error) {
      toast.error('Erreur lors de l\'approbation');
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) {
      toast.error('Veuillez fournir une raison pour le rejet');
      return;
    }

    try {
      await adminService.rejectThesis(id, rejectReason);
      toast.success('Thèse rejetée');
      setShowRejectModal(null);
      setRejectReason('');
      loadTheses();
    } catch (error) {
      toast.error('Erreur lors du rejet');
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedTheses.length === 0) {
      toast.error('Aucune thèse sélectionnée');
      return;
    }

    try {
      const promises = selectedTheses.map(id => 
        action === 'approve' 
          ? adminService.approveThesis(id)
          : adminService.rejectThesis(id, 'Action groupée')
      );
      
      await Promise.all(promises);
      toast.success(`${selectedTheses.length} thèse(s) ${action === 'approve' ? 'approuvée(s)' : 'rejetée(s)'}`);
      setSelectedTheses([]);
      loadTheses();
    } catch (error) {
      toast.error('Erreur lors de l\'action groupée');
    }
  };

  const statusOptions = [
    { value: 'all', label: 'Toutes', count: theses.length },
    { value: 'pending', label: 'En attente', count: theses.filter(t => t.status === 'pending').length },
    { value: 'approved', label: 'Approuvées', count: theses.filter(t => t.status === 'approved').length },
    { value: 'published', label: 'Publiées', count: theses.filter(t => t.status === 'published').length },
    { value: 'rejected', label: 'Rejetées', count: theses.filter(t => t.status === 'rejected').length }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published': return 'Publiée';
      case 'approved': return 'Approuvée';
      case 'pending': return 'En attente';
      case 'rejected': return 'Rejetée';
      default: return 'Brouillon';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des thèses</h1>
          <p className="mt-2 text-gray-600">
            Gérez les soumissions et validations des thèses
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par titre, auteur, institution..."
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

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="submittedAt_desc">Plus récent</option>
              <option value="submittedAt_asc">Plus ancien</option>
              <option value="title">Titre A-Z</option>
              <option value="author">Auteur A-Z</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedTheses.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-800">
                {selectedTheses.length} thèse(s) sélectionnée(s)
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleBulkAction('approve')}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 text-sm"
                >
                  Approuver toutes
                </button>
                <button
                  onClick={() => handleBulkAction('reject')}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 text-sm"
                >
                  Rejeter toutes
                </button>
                <button
                  onClick={() => setSelectedTheses([])}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors duration-200 text-sm"
                >
                  Désélectionner
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Theses List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                    <div className="w-12 h-16 bg-gray-200 rounded"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : theses.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune thèse trouvée
            </h3>
            <p className="text-gray-600">
              Aucune thèse ne correspond aux critères sélectionnés
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {theses.map((thesis) => (
              <div key={thesis.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                <div className="flex items-start space-x-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedTheses.includes(thesis.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTheses([...selectedTheses, thesis.id]);
                      } else {
                        setSelectedTheses(selectedTheses.filter(id => id !== thesis.id));
                      }
                    }}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />

                  {/* Thumbnail */}
                  <div className="w-12 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded flex items-center justify-center">
                    <FileText className="w-6 h-6 text-gray-400" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/thesis/${thesis.id}`}
                      className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors duration-200 line-clamp-2"
                    >
                      {thesis.title}
                    </Link>
                    
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600">
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
                        <span>{thesis.institution}</span>
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        {thesis.discipline}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                      <span>Soumise le {new Date(thesis.submittedAt).toLocaleDateString('fr-FR')}</span>
                      <span>{thesis.viewCount} vues</span>
                      <span>{thesis.downloadCount} téléchargements</span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(thesis.status)}`}>
                      {getStatusIcon(thesis.status)}
                      <span>{getStatusLabel(thesis.status)}</span>
                    </span>

                    {/* Actions */}
                    <div className="flex items-center space-x-1">
                      <Link
                        to={`/thesis/${thesis.id}`}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                        title="Voir la thèse"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>

                      {thesis.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(thesis.id)}
                            className="p-2 text-gray-400 hover:text-green-600 transition-colors duration-200"
                            title="Approuver"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowRejectModal(thesis.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors duration-200"
                            title="Rejeter"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      <div className="relative group">
                        <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                          <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            Modifier les métadonnées
                          </button>
                          <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            Télécharger le fichier
                          </button>
                          <hr className="my-1" />
                          <button className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Rejeter la thèse
            </h3>
            <p className="text-gray-600 mb-4">
              Veuillez fournir une raison pour le rejet de cette thèse.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Raison du rejet..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
              >
                Annuler
              </button>
              <button
                onClick={() => handleReject(showRejectModal)}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
              >
                Rejeter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}