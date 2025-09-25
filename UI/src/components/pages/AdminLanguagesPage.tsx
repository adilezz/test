import React, { useState, useEffect } from 'react';
import { 
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Globe,
  MoreHorizontal,
  X,
  Check,
  AlertCircle,
  ArrowUpDown,
  ToggleLeft,
  ToggleRight,
  Languages
} from 'lucide-react';
import { apiService } from '../../services/api';
import AdminHeader from '../layout/AdminHeader';
import { 
  LanguageResponse, 
  LanguageCreate, 
  LanguageUpdate,
  LanguageCode,
  PaginatedResponse
} from '../../types/api';

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'delete' | 'view';
  item?: LanguageResponse;
}

export default function AdminLanguagesPage() {
  const [languages, setLanguages] = useState<LanguageResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [modal, setModal] = useState<ModalState>({ isOpen: false, mode: 'create' });
  const [formData, setFormData] = useState<LanguageCreate>({
    name: '',
    code: LanguageCode.FRENCH,
    native_name: '',
    rtl: false,
    is_active: true,
    display_order: 0
  });
  const [sortField, setSortField] = useState<'display_order' | 'name' | 'code'>('display_order');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    loadLanguages();
  }, []);

  const loadLanguages = async () => {
    try {
      setLoading(true);
      const response = await apiService.adminList<PaginatedResponse>('languages', { 
        load_all: 'true',
        order_by: sortField,
        order_dir: sortDirection
      });
      setLanguages(response.data || []);
    } catch (error) {
      console.error('Error loading languages:', error);
      // Show user-friendly error message
      alert('Erreur lors du chargement des langues. Vérifiez votre connexion et vos permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  useEffect(() => {
    loadLanguages();
  }, [sortField, sortDirection]);

  const filteredLanguages = languages.filter(language =>
    language.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    language.native_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    language.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (mode: ModalState['mode'], item?: LanguageResponse) => {
    if (mode === 'create') {
      setFormData({
        name: '',
        code: LanguageCode.FRENCH,
        native_name: '',
        rtl: false,
        is_active: true,
        display_order: Math.max(...languages.map(l => l.display_order || 0), 0) + 1
      });
    } else if (mode === 'edit' && item) {
      setFormData({
        name: item.name,
        code: item.code,
        native_name: item.native_name,
        rtl: item.rtl,
        is_active: item.is_active,
        display_order: item.display_order
      });
    }
    setModal({ isOpen: true, mode, item });
  };

  const closeModal = () => {
    setModal({ isOpen: false, mode: 'create' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modal.mode === 'create') {
        await apiService.adminCreate('languages', formData);
        alert('Langue créée avec succès!');
      } else if (modal.mode === 'edit' && modal.item) {
        const updateData: LanguageUpdate = {
          name: formData.name !== modal.item.name ? formData.name : undefined,
          native_name: formData.native_name !== modal.item.native_name ? formData.native_name : undefined,
          rtl: formData.rtl !== modal.item.rtl ? formData.rtl : undefined,
          is_active: formData.is_active !== modal.item.is_active ? formData.is_active : undefined,
          display_order: formData.display_order !== modal.item.display_order ? formData.display_order : undefined,
        };
        
        // Only send fields that have changed
        const hasChanges = Object.values(updateData).some(value => value !== undefined);
        if (hasChanges) {
          await apiService.adminUpdate('languages', modal.item.id, updateData);
          alert('Langue mise à jour avec succès!');
        }
      }
      closeModal();
      loadLanguages();
    } catch (error) {
      console.error('Error saving language:', error);
      alert('Erreur lors de la sauvegarde de la langue. Vérifiez vos données et permissions.');
    }
  };

  const handleDelete = async () => {
    if (modal.item) {
      try {
        await apiService.adminDelete('languages', modal.item.id);
        alert('Langue supprimée avec succès!');
        closeModal();
        loadLanguages();
      } catch (error) {
        console.error('Error deleting language:', error);
        alert('Erreur lors de la suppression de la langue. Vérifiez vos permissions.');
      }
    }
  };

  const toggleLanguageStatus = async (language: LanguageResponse) => {
    try {
      await apiService.adminUpdate('languages', language.id, {
        is_active: !language.is_active
      });
      loadLanguages();
    } catch (error) {
      console.error('Error toggling language status:', error);
      alert('Erreur lors de la modification du statut de la langue.');
    }
  };

  const getLanguageCodeOptions = () => {
    const usedCodes = languages.map(l => l.code);
    return Object.values(LanguageCode).filter(code => 
      modal.mode === 'create' ? !usedCodes.includes(code) : true
    );
  };

  const getLanguageCodeLabel = (code: LanguageCode) => {
    const labels: Record<LanguageCode, string> = {
      [LanguageCode.FRENCH]: 'Français (fr)',
      [LanguageCode.ARABIC]: 'العربية (ar)',
      [LanguageCode.ENGLISH]: 'English (en)',
      [LanguageCode.SPANISH]: 'Español (es)',
      [LanguageCode.TAMAZIGHT]: 'ⵜⴰⵎⴰⵣⵉⵖⵜ (zgh)'
    };
    return labels[code] || code;
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
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Globe className="mr-3 h-8 w-8 text-blue-600" />
                Gestion des Langues
              </h1>
              <p className="text-gray-600 mt-2">
                Gérer les langues disponibles dans le système
              </p>
            </div>
            <button
              onClick={() => openModal('create')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Langue</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, nom natif ou code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Languages Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Langues ({filteredLanguages.length})
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('display_order')}
                      className="flex items-center space-x-1 hover:text-gray-700"
                    >
                      <span>Ordre</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('code')}
                      className="flex items-center space-x-1 hover:text-gray-700"
                    >
                      <span>Code</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center space-x-1 hover:text-gray-700"
                    >
                      <span>Nom</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom Natif
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Direction
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
                {filteredLanguages.map((language) => (
                  <tr key={language.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {language.display_order}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {language.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {language.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" dir={language.rtl ? 'rtl' : 'ltr'}>
                      {language.native_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        language.rtl 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {language.rtl ? 'RTL' : 'LTR'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <button
                        onClick={() => toggleLanguageStatus(language)}
                        className="flex items-center space-x-2 hover:bg-gray-100 rounded p-1"
                      >
                        {language.is_active ? (
                          <>
                            <ToggleRight className="w-5 h-5 text-green-600" />
                            <span className="text-green-700">Actif</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-5 h-5 text-gray-400" />
                            <span className="text-gray-500">Inactif</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openModal('view', language)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Voir"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal('edit', language)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal('delete', language)}
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

          {filteredLanguages.length === 0 && (
            <div className="text-center py-12">
              <Languages className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune langue trouvée</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Essayez de modifier vos critères de recherche.' : 'Commencez par ajouter une nouvelle langue.'}
              </p>
              {!searchTerm && (
                <div className="mt-6">
                  <button
                    onClick={() => openModal('create')}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvelle Langue
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal */}
        {modal.isOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {modal.mode === 'create' && 'Nouvelle Langue'}
                  {modal.mode === 'edit' && 'Modifier la Langue'}
                  {modal.mode === 'view' && 'Détails de la Langue'}
                  {modal.mode === 'delete' && 'Supprimer la Langue'}
                </h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {modal.mode === 'delete' ? (
                <div>
                  <div className="mb-4 flex items-center">
                    <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
                    <p className="text-sm text-gray-700">
                      Êtes-vous sûr de vouloir supprimer la langue <strong>{modal.item?.name}</strong> ?
                      Cette action est irréversible.
                    </p>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleDelete}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ) : modal.mode === 'view' && modal.item ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Code</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono">{modal.item.code}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nom</label>
                    <p className="mt-1 text-sm text-gray-900">{modal.item.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nom Natif</label>
                    <p className="mt-1 text-sm text-gray-900" dir={modal.item.rtl ? 'rtl' : 'ltr'}>
                      {modal.item.native_name}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Direction</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {modal.item.rtl ? 'Droite vers Gauche (RTL)' : 'Gauche vers Droite (LTR)'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Statut</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {modal.item.is_active ? 'Actif' : 'Inactif'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Ordre d'Affichage</label>
                    <p className="mt-1 text-sm text-gray-900">{modal.item.display_order}</p>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Code de Langue</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value as LanguageCode })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      placeholder="Ex: fr, en, ar, es, zgh"
                      maxLength={10}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Code ISO 639-1 (2 caractères) ou ISO 639-3 (3 caractères)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nom</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nom Natif</label>
                    <input
                      type="text"
                      value={formData.native_name}
                      onChange={(e) => setFormData({ ...formData, native_name: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      maxLength={100}
                      dir={formData.rtl ? 'rtl' : 'ltr'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Ordre d'Affichage</label>
                    <input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min={0}
                    />
                  </div>

                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.rtl}
                        onChange={(e) => setFormData({ ...formData, rtl: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Direction Droite vers Gauche (RTL)</span>
                    </label>
                  </div>

                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Langue Active</span>
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                    >
                      {modal.mode === 'create' ? 'Créer' : 'Sauvegarder'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}