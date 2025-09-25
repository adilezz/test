import React, { useState, useEffect } from 'react';
import { 
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  GraduationCap,
  Award,
  X,
  Check,
  AlertCircle,
  Globe,
  Hash
} from 'lucide-react';
import { apiService } from '../../services/api';
import AdminHeader from '../layout/AdminHeader';
import { 
  DegreeResponse,
  PaginatedResponse,
  DegreeCreate,
  DegreeUpdate,
  DegreeType,
  DegreeCategory
} from '../../types/api';

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'delete' | 'view';
  item?: DegreeResponse;
}

// Degree types and categories based on the API enums
const DEGREE_TYPES = [
  { value: DegreeType.DOCTORATE, label: 'Doctorat' },
  { value: DegreeType.MEDICAL_DOCTORATE, label: 'Doctorat en Médecine' },
  { value: DegreeType.MASTER, label: 'Master' }
];

const DEGREE_CATEGORIES = [
  { value: DegreeCategory.RESEARCH, label: 'Recherche' },
  { value: DegreeCategory.PROFESSIONAL, label: 'Professionnel' },
  { value: DegreeCategory.HONORARY, label: 'Honorifique' },
  { value: DegreeCategory.JOINT, label: 'Conjoint' },
  { value: DegreeCategory.INTERNATIONAL, label: 'International' }
];

export default function AdminDegreesPage() {
  const [data, setData] = useState<DegreeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modal, setModal] = useState<ModalState>({ isOpen: false, mode: 'create' });
  const [formData, setFormData] = useState<DegreeCreate>({
    name_en: '',
    name_fr: '',
    name_ar: '',
    abbreviation: '',
    type: DegreeType.DOCTORATE,
    category: null
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await apiService.adminList<PaginatedResponse>('degrees', { limit: 1000 });
      setData(response.data);
    } catch (error) {
      console.error('Error loading degrees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      // Clean the form data to ensure empty strings become null for optional fields
      const cleanedData = {
        ...formData,
        category: formData.category || null
      };
      await apiService.adminCreate('degrees', cleanedData);
      setModal({ isOpen: false, mode: 'create' });
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error creating degree:', error);
    }
  };

  const handleUpdate = async () => {
    if (!modal.item) return;
    
    try {
      // Clean the form data to ensure empty strings become null for optional fields
      const cleanedData = {
        ...formData,
        category: formData.category || null
      };
      await apiService.adminUpdate('degrees', modal.item.id, cleanedData);
      setModal({ isOpen: false, mode: 'edit' });
      loadData();
    } catch (error) {
      console.error('Error updating degree:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiService.adminDelete('degrees', id);
      loadData();
    } catch (error) {
      console.error('Error deleting degree:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name_en: '',
      name_fr: '',
      name_ar: '',
      abbreviation: '',
      type: DegreeType.DOCTORATE,
      category: null
    });
  };

  const openModal = (mode: ModalState['mode'], item?: DegreeResponse) => {
    setModal({ isOpen: true, mode, item });
    
    if (mode === 'edit' && item) {
      setFormData({
        name_en: item.name_en,
        name_fr: item.name_fr,
        name_ar: item.name_ar,
        abbreviation: item.abbreviation,
        type: item.type,
        category: item.category || null
      });
    } else if (mode === 'create') {
      resetForm();
    }
  };

  const filteredData = data.filter(degree => 
    degree.name_fr.toLowerCase().includes(searchTerm.toLowerCase()) ||
    degree.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
    degree.name_ar.includes(searchTerm) ||
    degree.abbreviation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderModal = () => {
    if (!modal.isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {modal.mode === 'create' && 'Nouveau Diplôme'}
              {modal.mode === 'edit' && 'Modifier Diplôme'}
              {modal.mode === 'view' && 'Détails Diplôme'}
              {modal.mode === 'delete' && 'Supprimer Diplôme'}
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
            }} className="space-y-6">
              
              {/* Names Section */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Dénominations</h3>
                <div className="space-y-4">
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
                      placeholder="Nom du diplôme en français"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name (English) *
                    </label>
                    <input
                      type="text"
                      value={formData.name_en}
                      onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      placeholder="Degree name in English"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الاسم (العربية) *
                    </label>
                    <input
                      type="text"
                      value={formData.name_ar}
                      onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      placeholder="اسم الشهادة بالعربية"
                      dir="rtl"
                    />
                  </div>
                </div>
              </div>

              {/* Details Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Détails</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Abréviation *
                    </label>
                    <input
                      type="text"
                      value={formData.abbreviation}
                      onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      placeholder="Ex: PhD, MSc, MD"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      {DEGREE_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Catégorie
                    </label>
                    <select
                      value={formData.category || ''}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value || null })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Aucune catégorie</option>
                      {DEGREE_CATEGORIES.map(category => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
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
            <div className="space-y-6">
              {/* Names */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Dénominations</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nom (Français)</label>
                    <p className="mt-1 text-gray-900">{modal.item.name_fr}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name (English)</label>
                    <p className="mt-1 text-gray-900">{modal.item.name_en}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">الاسم (العربية)</label>
                    <p className="mt-1 text-gray-900" dir="rtl">{modal.item.name_ar}</p>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Détails</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Abréviation</label>
                    <p className="mt-1 text-gray-900">{modal.item.abbreviation}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <p className="mt-1 text-gray-900">
                      {DEGREE_TYPES.find(t => t.value === modal.item?.type)?.label || modal.item.type}
                    </p>
                  </div>
                  {modal.item.category && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Catégorie</label>
                      <p className="mt-1 text-gray-900">
                        {DEGREE_CATEGORIES.find(c => c.value === modal.item?.category)?.label || modal.item.category}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Metadata */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Créé le</label>
                <p className="mt-1 text-gray-900">
                  {new Date(modal.item.created_at).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
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
      <AdminHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Diplômes</h1>
              <p className="text-gray-600 mt-2">
                Gérer les types de diplômes et leurs caractéristiques
              </p>
            </div>
            <button
              onClick={() => openModal('create')}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Diplôme</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Diplômes</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {data.length.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <Award className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Doctorats</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {data.filter(d => d.type === 'doctorate' || d.type === 'medical doctorate').length.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <Hash className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Masters</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {data.filter(d => d.type === 'master').length.toLocaleString()}
                </p>
              </div>
            </div>
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
                  placeholder="Rechercher des diplômes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Filter className="w-4 h-4" />
                <span>Filtres</span>
              </button>
            </div>

            <div className="text-sm text-gray-600">
              {filteredData.length} diplôme{filteredData.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Diplôme
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Abréviation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Catégorie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Créé le
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((degree) => (
                  <tr key={degree.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <GraduationCap className="w-4 h-4 text-white" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {degree.name_fr}
                          </div>
                          <div className="text-xs text-gray-500">
                            {degree.name_en}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {degree.abbreviation}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        degree.type === 'doctorate' || degree.type === 'medical doctorate' 
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {DEGREE_TYPES.find(t => t.value === degree.type)?.label || degree.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {degree.category ? (
                          DEGREE_CATEGORIES.find(c => c.value === degree.category)?.label || degree.category
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(degree.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openModal('view', degree)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal('edit', degree)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Êtes-vous sûr de vouloir supprimer ce diplôme ?')) {
                              handleDelete(degree.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredData.length === 0 && (
              <div className="text-center py-12">
                <GraduationCap className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">
                  {searchTerm ? 'Aucun diplôme trouvé pour cette recherche' : 'Aucun diplôme trouvé'}
                </p>
              </div>
            )}
          </div>
        </div>

        {renderModal()}
      </div>
    </div>
  );
}