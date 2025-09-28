import React, { useState, useEffect } from 'react';
import { 
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Globe,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Move,
  MapPin
} from 'lucide-react';
import { apiService } from '../../services/api';
import AdminHeader from '../layout/AdminHeader';
import TreeView from '../ui/TreeView/TreeView';
import { 
  mapApiTreeToUiNodes, 
  geographicHierarchyResolver 
} from '../../utils/treeMappers';
import { 
  GeographicEntityResponse, 
  TreeNodeData,
  PaginatedResponse,
  GeographicEntityCreate,
  GeographicEntityUpdate,
  GeographicLevel
} from '../../types/api';

interface TreeNode {
  id: string;
  name_fr: string;
  name_en?: string;
  name_ar?: string;
  level: GeographicLevel;
  parent_id?: string;
  code?: string;
  latitude?: number;
  longitude?: number;
  children?: TreeNode[];
  expanded?: boolean;
  thesis_count?: number;
}

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'delete' | 'view';
  item?: GeographicEntityResponse;
  parent?: TreeNode;
}

export default function AdminGeographicEntitiesPage() {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [treeNodes, setTreeNodes] = useState<any[]>([]);
  const [flatList, setFlatList] = useState<GeographicEntityResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [startLevel, setStartLevel] = useState<'country' | 'region' | 'province' | 'city'>('country');
  const [stopLevel, setStopLevel] = useState<'country' | 'region' | 'province' | 'city'>('city');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllEntities, setShowAllEntities] = useState(false);
  const [modal, setModal] = useState<ModalState>({ isOpen: false, mode: 'create' });
  const [formData, setFormData] = useState<GeographicEntityCreate>({
    name_fr: '',
    name_en: '',
    name_ar: '',
    level: GeographicLevel.COUNTRY,
    parent_id: '',
    code: '',
    latitude: undefined,
    longitude: undefined
  });

  useEffect(() => {
    loadData();
    setShowAllEntities(false); // Reset pagination when switching views
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

  // Show all entities effect
  useEffect(() => {
    if (viewMode === 'list') {
      loadData();
    }
  }, [showAllEntities]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (viewMode === 'tree') {
        const treeResponse = await apiService.getAdminReferencesTree({
          ref_type: 'geographic',
          start_level: startLevel,
          stop_level: stopLevel,
          include_counts: true
        });
        const nodes = mapApiTreeToUiNodes(treeResponse, geographicHierarchyResolver);
        setTreeNodes(nodes);
        setTreeData(transformToTreeNodesFromNested(treeResponse));
      } else {
        const params: Record<string, string | number> = {};
        if (searchTerm.trim()) {
          params.search = searchTerm.trim();
        }
        if (!showAllEntities) {
          params.limit = 20; // Show limited results initially
        }
        const listResponse = await apiService.adminList<PaginatedResponse>('geographic_entities', params);
        setFlatList(listResponse.data);
      }
    } catch (error) {
      console.error('Error loading geographic entities:', error);
    } finally {
      setLoading(false);
    }
  };

  const transformToTreeNodesFromNested = (data: any[]): TreeNode[] => {
    // Create a map of current expanded states
    const expandedStates = new Map<string, boolean>();
    const collectExpandedStates = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        if (node.expanded) {
          expandedStates.set(node.id, true);
        }
        if (node.children) {
          collectExpandedStates(node.children);
        }
      });
    };
    collectExpandedStates(treeData);

    const build = (node: any, level: number): TreeNode => ({
      id: node.id,
      name_fr: node.name_fr,
      name_en: node.name_en,
      name_ar: node.name_ar,
      level: node.level || GeographicLevel.COUNTRY,
      parent_id: node.parent_id,
      code: node.code,
      latitude: node.latitude,
      longitude: node.longitude,
      thesis_count: node.thesis_count,
      expanded: expandedStates.get(node.id) || false, // Preserve expanded state
      children: Array.isArray(node.children) ? node.children.map((ch: any) => build(ch, level + 1)) : []
    });
    return data.map(n => build(n, 0));
  };



  const handleCreate = async () => {
    try {
      const createData = {
        ...formData,
        parent_id: formData.parent_id || undefined,
        latitude: formData.latitude || undefined,
        longitude: formData.longitude || undefined
      };
      
      await apiService.adminCreate('geographic_entities', createData);
      setModal({ isOpen: false, mode: 'create' });
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error creating geographic entity:', error);
    }
  };

  const handleUpdate = async () => {
    if (!modal.item) return;
    
    try {
      const updateData = {
        ...formData,
        latitude: formData.latitude || undefined,
        longitude: formData.longitude || undefined
      };
      await apiService.adminUpdate('geographic_entities', modal.item.id, updateData);
      setModal({ isOpen: false, mode: 'edit' });
      loadData();
    } catch (error) {
      console.error('Error updating geographic entity:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiService.adminDelete('geographic_entities', id);
      loadData();
    } catch (error) {
      console.error('Error deleting geographic entity:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name_fr: '',
      name_en: '',
      name_ar: '',
      level: GeographicLevel.COUNTRY,
      parent_id: '',
      code: '',
      latitude: undefined,
      longitude: undefined
    });
  };

  const openModal = (mode: ModalState['mode'], item?: GeographicEntityResponse, parent?: TreeNode) => {
    setModal({ isOpen: true, mode, item, parent });
    
    if (mode === 'edit' && item) {
      setFormData({
        name_fr: item.name_fr,
        name_en: item.name_en || '',
        name_ar: item.name_ar || '',
        level: item.level,
        parent_id: item.parent_id || '',
        code: item.code || '',
        latitude: item.latitude || undefined,
        longitude: item.longitude || undefined
      });
    } else if (mode === 'create') {
      resetForm();
      if (parent) {
        // Determine child level based on parent level
        let childLevel = GeographicLevel.COUNTRY;
        switch (parent.level) {
          case GeographicLevel.COUNTRY:
            childLevel = GeographicLevel.REGION;
            break;
          case GeographicLevel.REGION:
            childLevel = GeographicLevel.PROVINCE;
            break;
          case GeographicLevel.PROVINCE:
            childLevel = GeographicLevel.CITY;
            break;
          default:
            childLevel = GeographicLevel.CITY;
        }
        
        setFormData(prev => ({
          ...prev,
          parent_id: parent.id,
          level: childLevel
        }));
      }
    }
  };

  const getLevelLabel = (level: GeographicLevel): string => {
    switch (level) {
      case GeographicLevel.COUNTRY:
        return 'Pays';
      case GeographicLevel.REGION:
        return 'Région';
      case GeographicLevel.PROVINCE:
        return 'Province/Préfecture';
      case GeographicLevel.CITY:
        return 'Ville';
      default:
        return level;
    }
  };

  const getLevelColor = (level: GeographicLevel): string => {
    switch (level) {
      case GeographicLevel.COUNTRY:
        return 'text-blue-600 bg-blue-100';
      case GeographicLevel.REGION:
        return 'text-green-600 bg-green-100';
      case GeographicLevel.PROVINCE:
        return 'text-purple-600 bg-purple-100';
      case GeographicLevel.CITY:
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };


  const renderModal = () => {
    if (!modal.isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {modal.mode === 'create' && (modal.parent ? `Nouvelle sous-entité de "${modal.parent.name_fr}"` : 'Nouvelle Entité Géographique')}
              {modal.mode === 'edit' && 'Modifier Entité Géographique'}
              {modal.mode === 'view' && 'Détails Entité Géographique'}
              {modal.mode === 'delete' && 'Supprimer Entité Géographique'}
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
              {modal.parent && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-blue-800">Entité parente:</span>
                    <span className="font-medium text-blue-900">{modal.parent.name_fr}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getLevelColor(modal.parent.level)}`}>
                      {getLevelLabel(modal.parent.level)}
                    </span>
                  </div>
                </div>
              )}

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
                    Niveau *
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value as GeographicLevel })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!!modal.parent}
                  >
                    <option value={GeographicLevel.COUNTRY}>Pays</option>
                    <option value={GeographicLevel.REGION}>Région</option>
                    <option value={GeographicLevel.PROVINCE}>Province/Préfecture</option>
                    <option value={GeographicLevel.CITY}>Ville</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Code
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Code ISO, postal, etc."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude || ''}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: 33.5731"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude || ''}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: -7.5898"
                  />
                </div>
              </div>

              {modal.parent && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Niveau:</span>
                    <span className={`text-sm px-2 py-1 rounded-full ${getLevelColor(formData.level)}`}>
                      {getLevelLabel(formData.level)}
                    </span>
                  </div>
                </div>
              )}

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
              <div className="flex items-center space-x-2 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm ${getLevelColor(modal.item.level)}`}>
                  {getLevelLabel(modal.item.level)}
                </span>
                {modal.item.code && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded text-sm">
                    {modal.item.code}
                  </span>
                )}
              </div>
              
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
              
              {(modal.item.latitude && modal.item.longitude) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Coordonnées</label>
                  <p className="mt-1 text-gray-900">
                    📍 {modal.item.latitude.toFixed(4)}, {modal.item.longitude.toFixed(4)}
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
              <h1 className="text-3xl font-bold text-gray-900">Entités Géographiques</h1>
              <p className="text-gray-600 mt-2">
                Gérer les pays, régions, provinces et villes
              </p>
            </div>
            <button
              onClick={() => openModal('create')}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Entité</span>
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Légende des niveaux:</h3>
          <div className="flex flex-wrap gap-3">
            {[GeographicLevel.COUNTRY, GeographicLevel.REGION, GeographicLevel.PROVINCE, GeographicLevel.CITY].map(level => (
              <div key={level} className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs ${getLevelColor(level)}`}>
                  {getLevelLabel(level)}
                </span>
              </div>
            ))}
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
              <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Filter className="w-4 h-4" />
                <span>Filtres</span>
              </button>

              {viewMode === 'tree' && (
                <div className="flex items-center space-x-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Niveau départ</label>
                    <select
                      value={startLevel}
                      onChange={(e) => setStartLevel(e.target.value as any)}
                      className="px-2 py-1 border border-gray-300 rounded"
                    >
                      <option value="country">Pays</option>
                      <option value="region">Région</option>
                      <option value="province">Province</option>
                      <option value="city">Ville</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Niveau fin</label>
                    <select
                      value={stopLevel}
                      onChange={(e) => setStopLevel(e.target.value as any)}
                      className="px-2 py-1 border border-gray-300 rounded"
                    >
                      <option value="country">Pays</option>
                      <option value="region">Région</option>
                      <option value="province">Province</option>
                      <option value="city">Ville</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

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

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          {viewMode === 'tree' ? (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Structure Hiérarchique des Entités Géographiques
              </h2>
              <TreeView 
                nodes={treeNodes} 
                searchable 
                showCounts 
                showIcons 
                maxHeight="500px" 
                showContextMenu={true}
                onNodeView={(node) => {
                  const entity = flatList.find(e => e.name_fr === node.label);
                  if (entity) {
                    openModal('view', entity);
                  }
                }}
                onNodeAdd={(node) => {
                  // For geographic entities, add a child entity
                  const parentEntity = flatList.find(e => e.name_fr === node.label);
                  if (parentEntity) {
                    const parentTreeNode = {
                      id: parentEntity.id,
                      name_fr: parentEntity.name_fr,
                      level: parentEntity.level
                    };
                    openModal('create', undefined, parentTreeNode);
                  }
                }}
                onNodeEdit={(node) => {
                  const entity = flatList.find(e => e.name_fr === node.label);
                  if (entity) {
                    openModal('edit', entity);
                  }
                }}
                onNodeDelete={(node) => {
                  const entity = flatList.find(e => e.name_fr === node.label);
                  if (entity && confirm(`Êtes-vous sûr de vouloir supprimer "${node.label}" ?`)) {
                    handleDelete(entity.id);
                  }
                }}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entité
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Niveau
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coordonnées
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
                  {flatList.map((entity) => (
                    <tr key={entity.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {entity.name_fr}
                          </div>
                          {(entity.name_en || entity.name_ar) && (
                            <div className="text-sm text-gray-500">
                              {entity.name_en && <span>{entity.name_en}</span>}
                              {entity.name_en && entity.name_ar && <span> • </span>}
                              {entity.name_ar && <span>{entity.name_ar}</span>}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getLevelColor(entity.level)}`}>
                          {getLevelLabel(entity.level)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entity.code || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entity.latitude && entity.longitude ? (
                          <span>📍 {entity.latitude.toFixed(4)}, {entity.longitude.toFixed(4)}</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(entity.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openModal('view', entity)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openModal('edit', entity)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Êtes-vous sûr de vouloir supprimer cette entité géographique ?')) {
                                handleDelete(entity.id);
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
              {viewMode === 'list' && !showAllEntities && flatList.length >= 20 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="text-center">
                    <button
                      onClick={() => setShowAllEntities(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors mx-auto"
                    >
                      <span>Afficher toutes les entités</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {viewMode === 'list' && showAllEntities && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="text-center">
                    <button
                      onClick={() => setShowAllEntities(false)}
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