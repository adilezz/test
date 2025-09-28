import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Edit, Trash2, Eye, Building2, 
  GraduationCap, Users, ChevronDown, ChevronRight, MapPin, 
  MoreHorizontal, X, Check, AlertCircle, Globe, Mail, Phone
} from 'lucide-react';
import { apiService } from '../../services/api';
import TreeView from '../ui/TreeView/TreeView';
import { TreeNode as UITreeNode } from '../../types/tree';
import AdminHeader from '../layout/AdminHeader';
import { 
  PrivateInstitutionResponse, 
  PrivateInstitutionCreate,
  PrivateInstitutionUpdate,
  PaginatedResponse
} from '../../types/api';

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'delete' | 'view';
  item?: PrivateInstitutionResponse;
}

export default function AdminPrivateInstitutionsPage() {
  const [institutions, setInstitutions] = useState<PrivateInstitutionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [modal, setModal] = useState<ModalState>({ isOpen: false, mode: 'create' });
  const [formData, setFormData] = useState<PrivateInstitutionCreate>({
    name_fr: '',
    name_en: '',
    name_ar: '',
    acronym: '',
    institution_type: 'school',
    level: 'secondary',
    is_active: true,
    accreditation_status: 'pending'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await apiService.adminList<PaginatedResponse>('private_institutions', { load_all: 'true' });
      setInstitutions(response.data || []);
    } catch (error) {
      console.error('Error loading private institutions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await apiService.adminCreate('private_institutions', formData);
      setModal({ isOpen: false, mode: 'create' });
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error creating private institution:', error);
    }
  };

  const handleUpdate = async () => {
    if (!modal.item) return;
    
    try {
      await apiService.adminUpdate('private_institutions', modal.item.id, formData);
      setModal({ isOpen: false, mode: 'edit' });
      loadData();
    } catch (error) {
      console.error('Error updating private institution:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiService.adminDelete('private_institutions', id);
      loadData();
    } catch (error) {
      console.error('Error deleting private institution:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name_fr: '',
      name_en: '',
      name_ar: '',
      acronym: '',
      institution_type: 'school',
      level: 'secondary',
      is_active: true,
      accreditation_status: 'pending'
    });
  };

  const openModal = (mode: ModalState['mode'], item?: PrivateInstitutionResponse) => {
    setModal({ isOpen: true, mode, item });
    if (mode === 'edit' && item) {
      setFormData({
        name_fr: item.name_fr,
        name_en: item.name_en || '',
        name_ar: item.name_ar || '',
        acronym: item.acronym || '',
        institution_type: item.institution_type,
        level: item.level,
        geographic_entities_id: item.geographic_entities_id,
        parent_institution_id: item.parent_institution_id,
        website: item.website || '',
        email: item.email || '',
        phone: item.phone || '',
        address: item.address || '',
        established_year: item.established_year,
        accreditation_status: item.accreditation_status,
        accreditation_body: item.accreditation_body || '',
        accreditation_date: item.accreditation_date || '',
        license_number: item.license_number || '',
        is_active: item.is_active
      });
    } else if (mode === 'create') {
      resetForm();
    }
  };

  const getInstitutionTypeLabel = (type: string) => {
    const labels = {
      university: 'Université',
      school: 'École',
      institute: 'Institut',
      academy: 'Académie',
      center: 'Centre'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getLevelLabel = (level: string) => {
    const labels = {
      primary: 'Primaire',
      secondary: 'Secondaire',
      higher: 'Supérieur',
      professional: 'Professionnel'
    };
    return labels[level as keyof typeof labels] || level;
  };

  const getAccreditationStatusColor = (status: string) => {
    const colors = {
      pending: 'text-yellow-600 bg-yellow-100',
      accredited: 'text-green-600 bg-green-100',
      suspended: 'text-orange-600 bg-orange-100',
      revoked: 'text-red-600 bg-red-100'
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  const filteredInstitutions = institutions.filter(institution => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      institution.name_fr.toLowerCase().includes(searchLower) ||
      (institution.name_en && institution.name_en.toLowerCase().includes(searchLower)) ||
      (institution.name_ar && institution.name_ar.toLowerCase().includes(searchLower)) ||
      institution.acronym?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
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
              <h1 className="text-3xl font-bold text-gray-900">Établissements Privés</h1>
              <p className="text-gray-600 mt-2">
                Gérer les écoles, universités et instituts privés
              </p>
            </div>
            <button
              onClick={() => openModal('create')}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvel Établissement</span>
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded-lg ${
                  viewMode === 'list' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Vue Liste
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Établissement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Niveau
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInstitutions.map((institution) => (
                  <tr key={institution.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {institution.name_fr}
                        </div>
                        {(institution.name_en || institution.name_ar) && (
                          <div className="text-sm text-gray-500">
                            {institution.name_en && <span>{institution.name_en}</span>}
                            {institution.name_en && institution.name_ar && <span> • </span>}
                            {institution.name_ar && <span>{institution.name_ar}</span>}
                          </div>
                        )}
                        {institution.acronym && (
                          <div className="text-xs text-gray-400">
                            {institution.acronym}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {getInstitutionTypeLabel(institution.institution_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getLevelLabel(institution.level)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getAccreditationStatusColor(institution.accreditation_status)}`}>
                        {institution.accreditation_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openModal('view', institution)}
                          className="text-gray-400 hover:text-gray-600"
                          title="Voir les détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal('edit', institution)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Êtes-vous sûr de vouloir supprimer cet établissement ?')) {
                              handleDelete(institution.id);
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
          </div>
        </div>

        {/* Modal */}
        {modal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {modal.mode === 'create' && 'Nouvel Établissement Privé'}
                  {modal.mode === 'edit' && 'Modifier Établissement Privé'}
                  {modal.mode === 'view' && 'Détails Établissement Privé'}
                </h2>
                <button
                  onClick={() => setModal({ isOpen: false, mode: 'create' })}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {(modal.mode === 'create' || modal.mode === 'edit') && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  modal.mode === 'create' ? handleCreate() : handleUpdate();
                }} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nom (Français) *
                      </label>
                      <input
                        type="text"
                        value={formData.name_fr}
                        onChange={(e) => setFormData({ ...formData, name_fr: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type d'établissement *
                      </label>
                      <select
                        value={formData.institution_type}
                        onChange={(e) => setFormData({ ...formData, institution_type: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="school">École</option>
                        <option value="university">Université</option>
                        <option value="institute">Institut</option>
                        <option value="academy">Académie</option>
                        <option value="center">Centre</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Niveau d'éducation *
                      </label>
                      <select
                        value={formData.level}
                        onChange={(e) => setFormData({ ...formData, level: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="primary">Primaire</option>
                        <option value="secondary">Secondaire</option>
                        <option value="higher">Supérieur</option>
                        <option value="professional">Professionnel</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Statut d'accréditation
                      </label>
                      <select
                        value={formData.accreditation_status}
                        onChange={(e) => setFormData({ ...formData, accreditation_status: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="pending">En attente</option>
                        <option value="accredited">Accrédité</option>
                        <option value="suspended">Suspendu</option>
                        <option value="revoked">Révoqué</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setModal({ isOpen: false, mode: 'create' })}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {modal.mode === 'create' ? 'Créer' : 'Modifier'}
                    </button>
                  </div>
                </form>
              )}

              {modal.mode === 'view' && modal.item && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nom (Français)</label>
                      <p className="mt-1 text-gray-900">{modal.item.name_fr}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type</label>
                      <p className="mt-1 text-gray-900">{getInstitutionTypeLabel(modal.item.institution_type)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Niveau</label>
                      <p className="mt-1 text-gray-900">{getLevelLabel(modal.item.level)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Statut d'accréditation</label>
                      <p className="mt-1 text-gray-900">{modal.item.accreditation_status}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}