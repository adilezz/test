import React, { useState, useEffect } from 'react';
import { 
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Building2,
  School,
  GraduationCap,
  Users,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  MapPin,
  Calendar,
  MoreHorizontal,
  X,
  Check,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiService } from '../../services/api';
import TreeView from '../ui/TreeView/TreeView';
import { TreeNode as UITreeNode } from '../../types/tree';
import { mapApiTreeToUiNodes, universitiesHierarchyResolver, schoolsHierarchyResolver } from '../../utils/treeMappers';
import AdminHeader from '../layout/AdminHeader';
import { 
  SchoolResponse, 
  UniversityResponse,
  TreeNodeData,
  PaginatedResponse,
  SchoolCreate,
  SchoolUpdate
} from '../../types/api';

//

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'delete' | 'view';
  item?: SchoolResponse;
}

export default function AdminSchoolsPage() {
  const [treeData, setTreeData] = useState<UITreeNode[]>([]);
  const [flatList, setFlatList] = useState<SchoolResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [startLevel, setStartLevel] = useState<'school' | 'department'>('school');
  const [stopLevel, setStopLevel] = useState<'school' | 'department'>('department');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [modal, setModal] = useState<ModalState>({ isOpen: false, mode: 'create' });
  const [schools, setSchools] = useState<SchoolResponse[]>([]);
  const [universities, setUniversities] = useState<UniversityResponse[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showAllSchools, setShowAllSchools] = useState(false);
  const [filters, setFilters] = useState({
    parent_school_id: '',
    has_departments: ''
  });
  const [formData, setFormData] = useState<SchoolCreate>({
    name_fr: '',
    name_en: '',
    name_ar: '',
    acronym: '',
    parent_university_id: undefined,
    parent_school_id: undefined
  });

  useEffect(() => {
    loadData();
    loadSchoolsList();
    loadUniversitiesList();
  }, []);

  // Show all schools effect
  useEffect(() => {
    if (viewMode === 'list') {
      loadData();
    }
  }, [showAllSchools]);


  const loadSchoolsList = async () => {
    try {
      const response = await apiService.adminList<PaginatedResponse>('schools', { load_all: 'true' });
      setSchools(response.data || []);
    } catch (error) {
      console.error('Error loading schools list:', error);
    }
  };

  const loadUniversitiesList = async () => {
    try {
      const response = await apiService.adminList<PaginatedResponse>('universities', { load_all: 'true' });
      setUniversities(response.data || []);
    } catch (error) {
      console.error('Error loading universities list:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, [viewMode, startLevel, stopLevel]);

  // Keep hierarchical view available when changing levels
  useEffect(() => {
    if (viewMode === 'tree') {
      // Ensure hierarchical view is maintained when levels change
      loadData();
    }
  }, [startLevel, stopLevel]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (viewMode === 'list') {
        loadData();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Filter effect
  useEffect(() => {
    if (viewMode === 'list') {
      loadData();
    }
  }, [filters]);

  //

  const loadData = async () => {
    setLoading(true);
    try {
      if (viewMode === 'tree') {
        const treeResponse = await apiService.getAdminReferencesTree({
          ref_type: 'schools',
          start_level: startLevel,
          stop_level: stopLevel,
          include_counts: true,
          include_theses: true,
          theses_per_node: 5
        });
        const nodes = mapApiTreeToUiNodes(treeResponse as any, schoolsHierarchyResolver);
        setTreeData(nodes);
      } else {
        const params: Record<string, string | number> = {};
        if (searchTerm.trim()) {
          params.search = searchTerm.trim();
        }
        if (filters.parent_school_id) {
          params.parent_school_id = filters.parent_school_id;
        }
        if (!showAllSchools) {
          params.limit = 20; // Show limited results initially
        }
        const listResponse = await apiService.adminList<PaginatedResponse>('schools', params);
        setFlatList(listResponse.data || []);
      }
    } catch (error) {
      console.error('Error loading schools:', error);
    } finally {
      setLoading(false);
    }
  };

  //

  //

  const handleCreate = async () => {
    try {
      // Validate that exactly one parent is selected
      const hasUniversityParent = formData.parent_university_id;
      const hasSchoolParent = formData.parent_school_id;
      
      if (!hasUniversityParent && !hasSchoolParent) {
        alert('Veuillez sélectionner une université ou une école parente');
        return;
      }
      
      if (hasUniversityParent && hasSchoolParent) {
        alert('Une école ne peut pas avoir à la fois une université et une école parente');
        return;
      }

      // Clean form data before sending
      const cleanData = {
        ...formData,
        name_en: formData.name_en || undefined,
        name_ar: formData.name_ar || undefined,
        acronym: formData.acronym || undefined,
        parent_university_id: formData.parent_university_id || undefined,
        parent_school_id: formData.parent_school_id || undefined
      };
      
      await apiService.adminCreate('schools', cleanData);
      setModal({ isOpen: false, mode: 'create' });
      setFormData({
        name_fr: '',
        name_en: '',
        name_ar: '',
        acronym: '',
        parent_university_id: undefined,
        parent_school_id: undefined
      });
      loadData();
      loadSchoolsList();
      loadUniversitiesList();
    } catch (error) {
      console.error('Error creating school:', error);
      alert('Erreur lors de la création de l\'école');
    }
  };

  const handleUpdate = async () => {
    if (!modal.item) return;
    
    try {
      // Clean form data before sending
      const cleanData = {
        ...formData,
        name_en: formData.name_en || undefined,
        name_ar: formData.name_ar || undefined,
        acronym: formData.acronym || undefined,
        parent_school_id: formData.parent_school_id || undefined
      };
      
      await apiService.adminUpdate('schools', modal.item.id, cleanData);
      setModal({ isOpen: false, mode: 'edit' });
      loadData();
      loadSchoolsList();
    } catch (error) {
      console.error('Error updating school:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiService.adminDelete('schools', id);
      loadData();
      loadSchoolsList();
    } catch (error) {
      console.error('Error deleting school:', error);
    }
  };

  const openModal = (mode: ModalState['mode'], item?: SchoolResponse) => {
    setModal({ isOpen: true, mode, item });
    if (mode === 'edit' && item) {
      setFormData({
        name_fr: item.name_fr,
        name_en: item.name_en || '',
        name_ar: item.name_ar || '',
        acronym: item.acronym || '',
        parent_school_id: item.parent_school_id || undefined
      });
    } else if (mode === 'create') {
      setFormData({
        name_fr: '',
        name_en: '',
        name_ar: '',
        acronym: '',
        parent_school_id: undefined
      });
    }
  };

  //

  const renderModal = () => {
    if (!modal.isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {modal.mode === 'create' && 'Nouvelle École'}
              {modal.mode === 'edit' && 'Modifier École'}
              {modal.mode === 'view' && 'Détails École'}
              {modal.mode === 'delete' && 'Supprimer École'}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom (Anglais)
                  </label>
                  <input
                    type="text"
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom (Arabe)
                  </label>
                  <input
                    type="text"
                    value={formData.name_ar}
                    onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    dir="rtl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Acronyme
                </label>
                <input
                  type="text"
                  value={formData.acronym}
                  onChange={(e) => setFormData({ ...formData, acronym: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Université parente *
                </label>
                <select
                  value={formData.parent_university_id || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    parent_university_id: e.target.value || undefined,
                    parent_school_id: e.target.value ? undefined : formData.parent_school_id
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required={!formData.parent_school_id}
                >
                  <option value="">Sélectionnez une université</option>
                  {universities.map((university) => (
                    <option key={university.id} value={university.id}>
                      {university.name_fr} {university.acronym && `(${university.acronym})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  École parente (alternative à l'université)
                </label>
                <select
                  value={formData.parent_school_id || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    parent_school_id: e.target.value || undefined,
                    parent_university_id: e.target.value ? undefined : formData.parent_university_id
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!!formData.parent_university_id}
                >
                  <option value="">Sélectionnez une école parente</option>
                  {schools.filter(s => s.id !== modal.item?.id).map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name_fr} {school.acronym && `(${school.acronym})`}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  Une école doit avoir soit une université parente, soit une école parente (pas les deux).
                </p>
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
                <label className="block text-sm font-medium text-gray-700">Nom (Français)</label>
                <p className="mt-1 text-gray-900">{modal.item.name_fr}</p>
              </div>
              {modal.item.name_en && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nom (Anglais)</label>
                  <p className="mt-1 text-gray-900">{modal.item.name_en}</p>
                </div>
              )}
              {modal.item.name_ar && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nom (Arabe)</label>
                  <p className="mt-1 text-gray-900" dir="rtl">{modal.item.name_ar}</p>
                </div>
              )}
              {modal.item.acronym && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Acronyme</label>
                  <p className="mt-1 text-gray-900">{modal.item.acronym}</p>
                </div>
              )}
              {modal.item.parent_school_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">École Parent</label>
                  <p className="mt-1 text-gray-900">
                    {schools.find(s => s.id === modal.item?.parent_school_id)?.name_fr || 'Non spécifiée'}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Créée le</label>
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
      <AdminHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Écoles</h1>
              <p className="text-gray-600 mt-2">
                Gérer les écoles et leurs hiérarchies
              </p>
            </div>
            <button
              onClick={() => openModal('create')}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle École</span>
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
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-3 py-2 border rounded-lg ${
                  showFilters 
                    ? 'bg-blue-50 border-blue-200 text-blue-700' 
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Filtres</span>
              </button>
            </div>

            {viewMode === 'tree' && (
              <div className="flex items-center space-x-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Niveau départ</label>
                  <select
                    value={startLevel}
                    onChange={(e) => setStartLevel(e.target.value as any)}
                    className="px-2 py-1 border border-gray-300 rounded"
                    disabled
                    title="Le niveau de départ est toujours École"
                  >
                    <option value="school">École</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Niveau fin</label>
                  <select
                    value={stopLevel}
                    onChange={(e) => setStopLevel(e.target.value as any)}
                    className="px-2 py-1 border border-gray-300 rounded"
                  >
                    <option value="school">École</option>
                    <option value="department">Département</option>
                  </select>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('tree')}
                className={`px-3 py-2 rounded-lg ${
                  viewMode === 'tree' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Vue Arbre
              </button>
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

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filtres</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  École Parent
                </label>
                <select
                  value={filters.parent_school_id}
                  onChange={(e) => setFilters({ ...filters, parent_school_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Toutes les écoles</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name_fr} {school.acronym && `(${school.acronym})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Avec départements
                </label>
                <select
                  value={filters.has_departments}
                  onChange={(e) => setFilters({ ...filters, has_departments: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Toutes</option>
                  <option value="yes">Avec départements</option>
                  <option value="no">Sans départements</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setFilters({ parent_school_id: '', has_departments: '' })}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          {viewMode === 'tree' ? (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Structure Hiérarchique des Écoles
              </h2>
              {treeData.length > 0 ? (
                <TreeView nodes={treeData} searchable showCounts showIcons maxHeight="500px" />
              ) : (
                <div className="space-y-1" />
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      École
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acronyme
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Parent
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
                  {flatList.map((school) => (
                    <tr key={school.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {school.name_fr}
                          </div>
                          {(school.name_en || school.name_ar) && (
                            <div className="text-sm text-gray-500">
                              {school.name_en && <span>{school.name_en}</span>}
                              {school.name_en && school.name_ar && <span> • </span>}
                              {school.name_ar && <span>{school.name_ar}</span>}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {school.acronym || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {school.parent_school_id && 
                          schools.find(s => s.id === school.parent_school_id)?.name_fr}
                        {!school.parent_school_id && '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(school.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openModal('view', school)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openModal('edit', school)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Êtes-vous sûr de vouloir supprimer cette école ?')) {
                                handleDelete(school.id);
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

              {/* Show All Button for List View */}
              {viewMode === 'list' && !showAllSchools && flatList.length >= 20 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="text-center">
                    <button
                      onClick={() => setShowAllSchools(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors mx-auto"
                    >
                      <span>Afficher toutes les écoles</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {viewMode === 'list' && showAllSchools && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="text-center">
                    <button
                      onClick={() => setShowAllSchools(false)}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors mx-auto"
                    >
                      <span>Afficher moins</span>
                      <ChevronRight className="w-4 h-4 rotate-90" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {renderModal()}
      </div>
    </div>
  );
}