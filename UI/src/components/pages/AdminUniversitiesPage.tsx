import React, { useState, useEffect } from 'react';
import { 
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Building2,
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
  UniversityResponse, 
  FacultyResponse, 
  DepartmentResponse,
  TreeNodeData,
  PaginatedResponse,
  UniversityCreate,
  UniversityUpdate
} from '../../types/api';

//

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'delete' | 'view';
  item?: UniversityResponse;
}

export default function AdminUniversitiesPage() {
  const [treeData, setTreeData] = useState<UITreeNode[]>([]);
  const [data, setData] = useState<UniversityResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [startLevel, setStartLevel] = useState<'university' | 'faculty' | 'department'>('university');
  const [stopLevel, setStopLevel] = useState<'university' | 'faculty' | 'department'>('department');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllUniversities, setShowAllUniversities] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [modal, setModal] = useState<ModalState>({ isOpen: false, mode: 'create' });
  const [geographicEntities, setGeographicEntities] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    geographic_entity: '',
    has_faculties: '',
    has_theses: ''
  });
  const [formData, setFormData] = useState<UniversityCreate>({
    name_fr: '',
    name_en: '',
    name_ar: '',
    acronym: '',
    geographic_entities_id: undefined
  });
  const [geoModalOpen, setGeoModalOpen] = useState(false);
  const [geoFilterModalOpen, setGeoFilterModalOpen] = useState(false);
  const [geoNodes, setGeoNodes] = useState<UITreeNode[]>([]);
  const [geoFilterNodes, setGeoFilterNodes] = useState<UITreeNode[]>([]);
  const [selectedGeoLabel, setSelectedGeoLabel] = useState<string>('');

  useEffect(() => {
    loadData();
    loadGeographicEntities();
  }, []);

  const loadGeographicEntities = async () => {
    try {
      const response = await apiService.adminList('geographic_entities', { load_all: 'true' });
      setGeographicEntities(response.data || []);
    } catch (error) {
      console.error('Error loading geographic entities:', error);
    }
  };

  const openGeoModal = async () => {
    try {
      setGeoModalOpen(true);
      // Try the unified admin references tree endpoint first
      let tree;
      try {
        tree = await apiService.getAdminReferencesTree({
          ref_type: 'geographic',
          start_level: 'country',
          stop_level: 'city',
          include_counts: false
        });
      } catch (err) {
        console.warn('Unified tree endpoint failed, trying dedicated endpoint:', err);
        // Fallback to dedicated geographic tree endpoint
        tree = await apiService.getGeographicEntitiesTree();
      }
      
      const mapNode = (n: any, level: number = 0): UITreeNode => ({
        id: n.id,
        label: n.name_fr,
        type: 'location',
        level,
        count: n.thesis_count || 0,
        children: Array.isArray(n.children) ? n.children.map((c: any) => mapNode(c, level + 1)) : []
      });
      setGeoNodes(Array.isArray(tree) ? tree.map((n: any) => mapNode(n, 0)) : []);
    } catch (e) {
      console.error('Failed to load geographic tree from all endpoints', e);
      // If both fail, keep nodes empty to show loading state
      setGeoNodes([]);
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

  // Show all universities effect
  useEffect(() => {
    if (viewMode === 'list') {
      loadData();
    }
  }, [showAllUniversities]);

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
        try {
          const treeResponse = await apiService.getAdminReferencesTree({
            ref_type: 'universities',
            start_level: startLevel,
            stop_level: stopLevel,
            include_counts: true,
            include_theses: true,
            theses_per_node: 5
          });
          setTreeData(mapApiTreeToUiNodes(treeResponse as any, universitiesHierarchyResolver));
        } catch (treeError) {
          console.warn('Unified tree endpoint failed, trying dedicated universities tree:', treeError);
          // Fallback to dedicated universities tree endpoint
          const fallbackResponse = await apiService.getUniversitiesTree(true, 5);
          setTreeData(mapApiTreeToUiNodes(fallbackResponse as any, universitiesHierarchyResolver));
        }
      } else {
        const params: Record<string, string | number> = {};
        if (searchTerm.trim()) {
          params.search = searchTerm.trim();
        }
        if (filters.geographic_entity) {
          params.geographic_entity_id = filters.geographic_entity;
        }
        if (!showAllUniversities) {
          params.limit = 20; // Show limited results initially
        }
        const listResponse = await apiService.adminList<PaginatedResponse>('universities', params);
        setData(listResponse.data || []);
      }
    } catch (error) {
      console.error('Error loading universities:', error);
      // Set empty data on error
      if (viewMode === 'tree') {
        setTreeData([]);
      } else {
        setData([]);
      }
    } finally {
      setLoading(false);
    }
  };

  //

  const handleCreate = async () => {
    try {
      // Clean form data before sending
      const cleanData = {
        ...formData,
        name_en: formData.name_en || undefined,
        name_ar: formData.name_ar || undefined,
        acronym: formData.acronym || undefined,
        geographic_entities_id: formData.geographic_entities_id || undefined
      };
      
      await apiService.adminCreate('universities', cleanData);
      setModal({ isOpen: false, mode: 'create' });
      setFormData({
        name_fr: '',
        name_en: '',
        name_ar: '',
        acronym: '',
        geographic_entities_id: undefined
      });
      loadData();
    } catch (error) {
      console.error('Error creating university:', error);
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
        geographic_entities_id: formData.geographic_entities_id || undefined
      };
      
      await apiService.adminUpdate('universities', modal.item.id, cleanData);
      setModal({ isOpen: false, mode: 'edit' });
      loadData();
    } catch (error) {
      console.error('Error updating university:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiService.adminDelete('universities', id);
      loadData();
    } catch (error) {
      console.error('Error deleting university:', error);
    }
  };

  // Context Menu Handlers
  const handleNodeView = (node: UITreeNode) => {
    const university = data.find(u => u.id === node.id);
    if (university) {
      setModal({ isOpen: true, mode: 'view', item: university });
    }
  };

  const handleNodeAdd = (node: UITreeNode) => {
    // Add a new faculty under this university
    setFormData({
      name_fr: '',
      name_en: '',
      name_ar: '',
      acronym: '',
      geographic_entities_id: node.id === 'root' ? '' : node.id
    });
    setModal({ isOpen: true, mode: 'create' });
  };

  const handleNodeEdit = (node: UITreeNode) => {
    const university = data.find(u => u.id === node.id);
    if (university) {
      setFormData({
        name_fr: university.name_fr,
        name_en: university.name_en || '',
        name_ar: university.name_ar || '',
        acronym: university.acronym || '',
        geographic_entities_id: university.geographic_entities_id || ''
      });
      setModal({ isOpen: true, mode: 'edit', item: university });
    }
  };

  const handleNodeDelete = (node: UITreeNode) => {
    const university = data.find(u => u.id === node.id);
    if (university) {
      setModal({ isOpen: true, mode: 'delete', item: university });
    }
  };

  const openModal = (mode: ModalState['mode'], item?: UniversityResponse) => {
    setModal({ isOpen: true, mode, item });
    if (mode === 'edit' && item) {
      setFormData({
        name_fr: item.name_fr,
        name_en: item.name_en || '',
        name_ar: item.name_ar || '',
        acronym: item.acronym || '',
        geographic_entities_id: item.geographic_entities_id || undefined
      });
    } else if (mode === 'create') {
      setFormData({
        name_fr: '',
        name_en: '',
        name_ar: '',
        acronym: '',
        geographic_entities_id: undefined
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
              {modal.mode === 'create' && 'Nouvelle Université'}
              {modal.mode === 'edit' && 'Modifier Université'}
              {modal.mode === 'view' && 'Détails Université'}
              {modal.mode === 'delete' && 'Supprimer Université'}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    Localisation
                  </label>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={openGeoModal}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-left flex items-center justify-between focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <span className={selectedGeoLabel ? "text-gray-900" : "text-gray-500"}>
                        {selectedGeoLabel || "Sélectionner une localisation"}
                      </span>
                      <MapPin className="w-4 h-4 text-gray-400" />
                    </button>
                    {selectedGeoLabel && (
                      <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                        <span>Sélectionné: {selectedGeoLabel}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, geographic_entities_id: undefined });
                            setSelectedGeoLabel('');
                          }}
                          className="text-gray-400 hover:text-red-500"
                          title="Supprimer la sélection"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
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
              {modal.item.geographic_entities_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Localisation</label>
                  <p className="mt-1 text-gray-900">
                    {geographicEntities.find(e => e.id === modal.item?.geographic_entities_id)?.name_fr || 'Non spécifiée'}
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
              <h1 className="text-3xl font-bold text-gray-900">Universités</h1>
              <p className="text-gray-600 mt-2">
                Gérer les universités, facultés et départements
              </p>
            </div>
            <button
              onClick={() => openModal('create')}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Université</span>
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
                    title="Le niveau de départ est toujours Université"
                  >
                    <option value="university">Université</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Niveau fin</label>
                  <select
                    value={stopLevel}
                    onChange={(e) => setStopLevel(e.target.value as any)}
                    className="px-2 py-1 border border-gray-300 rounded"
                  >
                    <option value="university">Université</option>
                    <option value="faculty">Faculté</option>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Localisation
                </label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={async () => {
                      // Open location filter modal
                      try {
                        setGeoFilterModalOpen(true);
                        let tree;
                        try {
                          tree = await apiService.getAdminReferencesTree({
                            ref_type: 'geographic',
                            start_level: 'country',
                            stop_level: 'city',
                            include_counts: false
                          });
                        } catch (err) {
                          console.warn('Unified tree endpoint failed, trying dedicated endpoint:', err);
                          tree = await apiService.getGeographicEntitiesTree();
                        }
                        
                        const mapNode = (n: any, level: number = 0): UITreeNode => ({
                          id: n.id,
                          label: n.name_fr,
                          type: 'location',
                          level,
                          count: n.thesis_count || 0,
                          children: Array.isArray(n.children) ? n.children.map((c: any) => mapNode(c, level + 1)) : []
                        });
                        setGeoFilterNodes(Array.isArray(tree) ? tree.map((n: any) => mapNode(n, 0)) : []);
                      } catch (e) {
                        console.error('Failed to load geographic tree', e);
                        setGeoFilterNodes([]);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-left flex items-center justify-between focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <span className={filters.geographic_entity ? "text-gray-900" : "text-gray-500"}>
                      {filters.geographic_entity ? 
                        geographicEntities.find(e => e.id === filters.geographic_entity)?.name_fr || "Localisation sélectionnée" :
                        "Toutes les localisations"
                      }
                    </span>
                    <MapPin className="w-4 h-4 text-gray-400" />
                  </button>
                  {filters.geographic_entity && (
                    <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                      <span>Filtré par: {geographicEntities.find(e => e.id === filters.geographic_entity)?.name_fr}</span>
                      <button
                        type="button"
                        onClick={() => setFilters({ ...filters, geographic_entity: '' })}
                        className="text-gray-400 hover:text-red-500"
                        title="Supprimer le filtre"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Avec facultés
                </label>
                <select
                  value={filters.has_faculties}
                  onChange={(e) => setFilters({ ...filters, has_faculties: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Toutes</option>
                  <option value="yes">Avec facultés</option>
                  <option value="no">Sans facultés</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Avec thèses
                </label>
                <select
                  value={filters.has_theses}
                  onChange={(e) => setFilters({ ...filters, has_theses: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Toutes</option>
                  <option value="yes">Avec thèses</option>
                  <option value="no">Sans thèses</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setFilters({ geographic_entity: '', has_faculties: '', has_theses: '' })}
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
                Structure Hiérarchique
              </h2>
              {treeData.length > 0 ? (
                <TreeView 
                  nodes={treeData} 
                  searchable 
                  showCounts 
                  showIcons 
                  maxHeight="500px"
                  showContextMenu={true}
                  onNodeView={handleNodeView}
                  onNodeAdd={handleNodeAdd}
                  onNodeEdit={handleNodeEdit}
                  onNodeDelete={handleNodeDelete}
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <div className="text-center">
                    <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">Aucune université trouvée</p>
                    <p className="text-sm">
                      {searchTerm ? 'Aucun résultat pour votre recherche' : 'Aucune donnée disponible'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Université
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acronyme
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
                  {data.length > 0 ? (
                    data.map((university) => (
                      <tr key={university.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {university.name_fr}
                            </div>
                            {(university.name_en || university.name_ar) && (
                              <div className="text-sm text-gray-500">
                                {university.name_en && <span>{university.name_en}</span>}
                                {university.name_en && university.name_ar && <span> • </span>}
                                {university.name_ar && <span>{university.name_ar}</span>}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {university.acronym || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(university.created_at).toLocaleDateString('fr-FR')}
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openModal('view', university)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <Link
                            to={`/admin/faculties?university_id=${university.id}`}
                            className="text-green-600 hover:text-green-900"
                            title="Gérer les facultés"
                          >
                            <GraduationCap className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => openModal('edit', university)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Êtes-vous sûr de vouloir supprimer cette université ?')) {
                                handleDelete(university.id);
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
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-16 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <Building2 className="w-12 h-12 mb-4 text-gray-300" />
                          <p className="text-lg font-medium">Aucune université trouvée</p>
                          <p className="text-sm">
                            {searchTerm || filters.geographic_entity ? 'Aucun résultat pour vos critères de recherche' : 'Aucune donnée disponible'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Show All Button for List View */}
              {viewMode === 'list' && !showAllUniversities && data.length >= 20 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="text-center">
                    <button
                      onClick={() => setShowAllUniversities(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors mx-auto"
                    >
                      <span>Afficher toutes les universités</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {viewMode === 'list' && showAllUniversities && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="text-center">
                    <button
                      onClick={() => setShowAllUniversities(false)}
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
        
        {/* Location Filter Modal */}
        {geoFilterModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Filtrer par localisation</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Sélectionnez une localisation pour filtrer les universités
                  </p>
                </div>
                <button
                  onClick={() => setGeoFilterModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Hierarchy Info */}
              <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
                <div className="flex items-center space-x-2 text-sm text-blue-700">
                  <MapPin className="w-4 h-4" />
                  <span>Maroc → Région → Province/Préfecture → Ville</span>
                </div>
              </div>

              {/* Tree Content */}
              <div className="flex-1 p-6 overflow-hidden">
                {geoFilterNodes.length > 0 ? (
                  <TreeView
                    nodes={geoFilterNodes}
                    onNodeSelect={(node) => {
                      setFilters({ ...filters, geographic_entity: node.id });
                      setGeoFilterModalOpen(false);
                    }}
                    multiSelect={false}
                    searchable={true}
                    maxHeight="450px"
                    showCounts={false}
                    showIcons={true}
                    className="border-0"
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>Chargement de la hiérarchie géographique...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-600">
                  Cliquez sur un élément pour filtrer par cette localisation
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setFilters({ ...filters, geographic_entity: '' });
                      setGeoFilterModalOpen(false);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Effacer le filtre
                  </button>
                  <button
                    onClick={() => setGeoFilterModalOpen(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* University Location Selection Modal */}
        {geoModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Sélectionner une localisation</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Choisissez la localisation géographique de l'université
                  </p>
                </div>
                <button
                  onClick={() => setGeoModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Hierarchy Info */}
              <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
                <div className="flex items-center space-x-2 text-sm text-blue-700">
                  <MapPin className="w-4 h-4" />
                  <span>Maroc → Région → Province/Préfecture → Ville</span>
                </div>
              </div>

              {/* Tree Content */}
              <div className="flex-1 p-6 overflow-hidden">
                {geoNodes.length > 0 ? (
                  <TreeView
                    nodes={geoNodes}
                    onNodeSelect={(node) => {
                      setFormData(prev => ({ ...prev, geographic_entities_id: node.id }));
                      setSelectedGeoLabel(node.label);
                      setGeoModalOpen(false);
                    }}
                    multiSelect={false}
                    searchable={true}
                    maxHeight="450px"
                    showCounts={false}
                    showIcons={true}
                    className="border-0"
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>Chargement de la hiérarchie géographique...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-600">
                  Cliquez sur un élément pour le sélectionner
                </p>
                <button
                  onClick={() => setGeoModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}