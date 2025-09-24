import React, { useState, useEffect } from 'react';
import { 
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Tag,
  Tags,
  X,
  Check,
  AlertCircle,
  Globe,
  Hash
} from 'lucide-react';
import { apiService } from '../../services/api';
import { 
  KeywordResponse,
  PaginatedResponse,
  KeywordCreate,
  KeywordUpdate
} from '../../types/api';

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'delete' | 'view';
  item?: KeywordResponse;
}

export default function AdminKeywordsPage() {
  const [data, setData] = useState<KeywordResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modal, setModal] = useState<ModalState>({ isOpen: false, mode: 'create' });
  const [formData, setFormData] = useState<KeywordCreate>({
    word_fr: '',
    word_en: '',
    word_ar: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await apiService.adminList<PaginatedResponse>('keywords', { limit: 1000 });
      setData(response.data);
    } catch (error) {
      console.error('Error loading keywords:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await apiService.adminCreate('keywords', formData);
      setModal({ isOpen: false, mode: 'create' });
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error creating keyword:', error);
    }
  };

  const handleUpdate = async () => {
    if (!modal.item) return;
    
    try {
      await apiService.adminUpdate('keywords', modal.item.id, formData);
      setModal({ isOpen: false, mode: 'edit' });
      loadData();
    } catch (error) {
      console.error('Error updating keyword:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiService.adminDelete('keywords', id);
      loadData();
    } catch (error) {
      console.error('Error deleting keyword:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      word_fr: '',
      word_en: '',
      word_ar: ''
    });
  };

  const openModal = (mode: ModalState['mode'], item?: KeywordResponse) => {
    setModal({ isOpen: true, mode, item });
    
    if (mode === 'edit' && item) {
      setFormData({
        word_fr: item.word_fr,
        word_en: item.word_en || '',
        word_ar: item.word_ar || ''
      });
    } else if (mode === 'create') {
      resetForm();
    }
  };

  const filteredData = data.filter(keyword => 
    keyword.word_fr.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (keyword.word_en && keyword.word_en.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (keyword.word_ar && keyword.word_ar.includes(searchTerm))
  );

  const renderModal = () => {
    if (!modal.isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {modal.mode === 'create' && 'Nouveau Mot-clé'}
              {modal.mode === 'edit' && 'Modifier Mot-clé'}
              {modal.mode === 'view' && 'Détails Mot-clé'}
              {modal.mode === 'delete' && 'Supprimer Mot-clé'}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mot-clé (Français) *
                </label>
                <input
                  type="text"
                  value={formData.word_fr}
                  onChange={(e) => setFormData({ ...formData, word_fr: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  placeholder="Mot-clé en français"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mot-clé (Anglais)
                </label>
                <input
                  type="text"
                  value={formData.word_en}
                  onChange={(e) => setFormData({ ...formData, word_en: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Keyword in English"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mot-clé (Arabe)
                </label>
                <input
                  type="text"
                  value={formData.word_ar}
                  onChange={(e) => setFormData({ ...formData, word_ar: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="الكلمة المفتاحية بالعربية"
                  dir="rtl"
                />
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
              <div>
                <label className="block text-sm font-medium text-gray-700">Mot-clé (Français)</label>
                <p className="mt-1 text-gray-900">{modal.item.word_fr}</p>
              </div>
              
              {modal.item.word_en && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mot-clé (Anglais)</label>
                  <p className="mt-1 text-gray-900">{modal.item.word_en}</p>
                </div>
              )}
              
              {modal.item.word_ar && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mot-clé (Arabe)</label>
                  <p className="mt-1 text-gray-900" dir="rtl">{modal.item.word_ar}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Créé le</label>
                <p className="mt-1 text-gray-900">
                  {new Date(modal.item.created_at).toLocaleDateString('fr-FR')}
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mots-clés</h1>
              <p className="text-gray-600 mt-2">
                Gérer le vocabulaire contrôlé pour l'indexation des thèses
              </p>
            </div>
            <button
              onClick={() => openModal('create')}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Mot-clé</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <Tags className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Mots-clés</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {data.length.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <Globe className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Multilingues</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {data.filter(k => k.word_en || k.word_ar).length.toLocaleString()}
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
                <p className="text-sm font-medium text-gray-600">Français uniquement</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {data.filter(k => !k.word_en && !k.word_ar).length.toLocaleString()}
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
                  placeholder="Rechercher des mots-clés..."
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
              {filteredData.length} mot{filteredData.length !== 1 ? 's' : ''}-clé{filteredData.length !== 1 ? 's' : ''}
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
                    Mot-clé (Français)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Anglais
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Arabe
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
                {filteredData.map((keyword) => (
                  <tr key={keyword.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <Tag className="w-4 h-4 text-white" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {keyword.word_fr}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {keyword.word_en || <span className="text-gray-400">-</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900" dir="rtl">
                        {keyword.word_ar || <span className="text-gray-400">-</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(keyword.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openModal('view', keyword)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal('edit', keyword)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Êtes-vous sûr de vouloir supprimer ce mot-clé ?')) {
                              handleDelete(keyword.id);
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
                <Tags className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">
                  {searchTerm ? 'Aucun mot-clé trouvé pour cette recherche' : 'Aucun mot-clé trouvé'}
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