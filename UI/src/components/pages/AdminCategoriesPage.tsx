import React, { useState, useEffect } from 'react';
import { 
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Tags,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Move
} from 'lucide-react';
import { apiService } from '../../services/api';
import AdminHeader from '../layout/AdminHeader';
import TreeView from '../ui/TreeView/TreeView';
import { 
  mapApiTreeToUiNodes, 
  categoriesHierarchyResolver 
} from '../../utils/treeMappers';
import { 
  CategoryResponse, 
  TreeNodeData,
  PaginatedResponse,
  CategoryCreate,
  CategoryUpdate
} from '../../types/api';

interface TreeNode {
  id: string;
  code?: string;
  name_fr: string;
  name_en?: string;
  name_ar?: string;
  description?: string;
  level: number;
  parent_id?: string;
  children?: TreeNode[];
  expanded?: boolean;
  thesis_count?: number;
}

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'delete' | 'view';
  item?: CategoryResponse;
  parent?: TreeNode;
}

export default function AdminCategoriesPage() {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [treeNodes, setTreeNodes] = useState<any[]>([]);
  const [flatList, setFlatList] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [startLevel, setStartLevel] = useState<'domain' | 'discipline' | 'specialty' | 'subdiscipline'>('domain');
  const [stopLevel, setStopLevel] = useState<'domain' | 'discipline' | 'specialty' | 'subdiscipline'>('subdiscipline');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [modal, setModal] = useState<ModalState>({ isOpen: false, mode: 'create' });
  const [formData, setFormData] = useState<CategoryCreate>({
    code: '',
    name_fr: '',
    name_en: '',
    name_ar: '',
    description: '',
    level: 0,
    parent_id: ''
  });

  useEffect(() => {
    loadData();
    setShowAllCategories(false); // Reset pagination when switching views
  }, [viewMode, startLevel, stopLevel]);

  // Keep hierarchical view available when changing levels
  useEffect(() => {
    if (viewMode === 'tree') {
      // Ensure hierarchical view is maintained when levels change
      loadData();
    }
  }, [startLevel, stopLevel]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (viewMode === 'tree') {
        const treeResponse = await apiService.getAdminReferencesTree({
          ref_type: 'categories',
          start_level: startLevel,
          stop_level: stopLevel,
          include_counts: true
        });
        const nodes = mapApiTreeToUiNodes(treeResponse, categoriesHierarchyResolver);
        setTreeNodes(nodes);
        setTreeData(transformToTreeNodesFromNested(treeResponse));
      } else {
        const allCategories = await apiService.getAllCategories();
        const hierarchicalList = buildHierarchicalList(allCategories);
        setFlatList(hierarchicalList);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
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
      code: node.code,
      name_fr: node.name_fr,
      name_en: node.name_en,
      name_ar: node.name_ar,
      description: node.description,
      level: typeof node.level === 'number' ? node.level : level,
      parent_id: node.parent_id,
      thesis_count: node.thesis_count,
      expanded: expandedStates.get(node.id) || false, // Preserve expanded state
      children: Array.isArray(node.children) ? node.children.map((ch: any) => build(ch, (typeof node.level === 'number' ? node.level : level) + 1)) : []
    });
    return data.map(n => build(n, 0));
  };

  const buildHierarchicalList = (categories: CategoryResponse[]): CategoryResponse[] => {
    // Sort by level first, then by name
    const sorted = [...categories].sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.name_fr.localeCompare(b.name_fr);
    });

    // Create a map for quick parent lookup
    const categoryMap = new Map(sorted.map(cat => [cat.id, cat]));
    const result: CategoryResponse[] = [];

    // Group by parent_id to maintain hierarchy
    const byParent = new Map<string | null, CategoryResponse[]>();
    sorted.forEach(cat => {
      const parentId = cat.parent_id || null;
      if (!byParent.has(parentId)) {
        byParent.set(parentId, []);
      }
      byParent.get(parentId)!.push(cat);
    });

    // Recursive function to build the flat hierarchical list
    const addChildren = (parentId: string | null, depth: number = 0) => {
      const children = byParent.get(parentId) || [];
      children.forEach(child => {
        // Add indentation info for display
        (child as any).depth = depth;
        result.push(child);
        addChildren(child.id, depth + 1);
      });
    };

    addChildren(null);
    return result;
  };

  const filteredCategories = flatList.filter(category => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      category.name_fr.toLowerCase().includes(searchLower) ||
      category.code.toLowerCase().includes(searchLower) ||
      (category.name_en && category.name_en.toLowerCase().includes(searchLower)) ||
      (category.name_ar && category.name_ar.toLowerCase().includes(searchLower)) ||
      (category.description && category.description.toLowerCase().includes(searchLower))
    );
  });


  const displayedCategories = viewMode === 'list' && !showAllCategories 
    ? filteredCategories.slice(0, 50) 
    : filteredCategories;


  const handleCreate = async () => {
    try {
      const createData = {
        ...formData,
        parent_id: formData.parent_id || undefined,
        level: modal.parent ? modal.parent.level + 1 : 0
      };
      
      await apiService.adminCreate('categories', createData);
      setModal({ isOpen: false, mode: 'create' });
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const handleUpdate = async () => {
    if (!modal.item) return;
    
    try {
      await apiService.adminUpdate('categories', modal.item.id, formData);
      setModal({ isOpen: false, mode: 'edit' });
      loadData();
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiService.adminDelete('categories', id);
      loadData();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name_fr: '',
      name_en: '',
      name_ar: '',
      description: '',
      level: 0,
      parent_id: ''
    });
  };

  const openModal = (mode: ModalState['mode'], item?: CategoryResponse, parent?: TreeNode) => {
    setModal({ isOpen: true, mode, item, parent });
    
    if (mode === 'edit' && item) {
      setFormData({
        code: item.code,
        name_fr: item.name_fr,
        name_en: item.name_en || '',
        name_ar: item.name_ar || '',
        description: item.description || '',
        level: item.level,
        parent_id: item.parent_id || ''
      });
    } else if (mode === 'create') {
      resetForm();
      if (parent) {
        setFormData(prev => ({
          ...prev,
          parent_id: parent.id,
          level: parent.level + 1
        }));
      }
    }
  };

  const getLevelLabel = (level: number): string => {
    const labels = ['Discipline', 'Sous-discipline', 'Spécialité', 'Sous-spécialité'];
    return labels[level] || `Niveau ${level + 1}`;
  };

  const getLevelColor = (level: number): string => {
    const colors = [
      'text-blue-600 bg-blue-100',
      'text-green-600 bg-green-100', 
      'text-purple-600 bg-purple-100',
      'text-orange-600 bg-orange-100'
    ];
    return colors[level] || 'text-gray-600 bg-gray-100';
  };


  const renderModal = () => {
    if (!modal.isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {modal.mode === 'create' && (modal.parent ? `Nouvelle sous-catégorie de "${modal.parent.name_fr}"` : 'Nouvelle Catégorie')}
              {modal.mode === 'edit' && 'Modifier Catégorie'}
              {modal.mode === 'view' && 'Détails Catégorie'}
              {modal.mode === 'delete' && 'Supprimer Catégorie'}
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
                    <span className="text-sm text-blue-800">Catégorie parente:</span>
                    <span className="font-medium text-blue-900">{modal.parent.name_fr}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getLevelColor(modal.parent.level)}`}>
                      {getLevelLabel(modal.parent.level)}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Code *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ex: MATH, PHYS, INFO"
                    required
                  />
                </div>
                
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
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Description optionnelle de la catégorie"
                />
              </div>

              {modal.parent && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Niveau:</span>
                    <span className={`text-sm px-2 py-1 rounded-full ${getLevelColor(modal.parent.level + 1)}`}>
                      {getLevelLabel(modal.parent.level + 1)}
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
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Code</label>
                  <p className="mt-1">
                    <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                      {modal.item.code}
                    </code>
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nom (Français)</label>
                  <p className="mt-1 text-gray-900">{modal.item.name_fr}</p>
                </div>
              </div>
              
              {(modal.item.name_en || modal.item.name_ar) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
              )}
              
              {modal.item.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <p className="mt-1 text-gray-900">{modal.item.description}</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Catégories</h1>
              <p className="text-gray-600 mt-2">
                Gérer les disciplines, sous-disciplines et spécialités
              </p>
            </div>
            <button
              onClick={() => openModal('create')}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Catégorie</span>
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Légende des niveaux:</h3>
          <div className="flex flex-wrap gap-3">
            {[0, 1, 2, 3].map(level => (
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
            </div>

            {viewMode === 'tree' && (
              <div className="flex items-center space-x-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Niveau départ</label>
                  <select
                    value={startLevel}
                    onChange={(e) => setStartLevel(e.target.value as any)}
                    className="px-2 py-1 border border-gray-300 rounded"
                  >
                    <option value="domain">Domaine</option>
                    <option value="discipline">Discipline</option>
                    <option value="specialty">Spécialité</option>
                    <option value="subdiscipline">Sous-discipline</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Niveau fin</label>
                  <select
                    value={stopLevel}
                    onChange={(e) => setStopLevel(e.target.value as any)}
                    className="px-2 py-1 border border-gray-300 rounded"
                  >
                    <option value="domain">Domaine</option>
                    <option value="discipline">Discipline</option>
                    <option value="specialty">Spécialité</option>
                    <option value="subdiscipline">Sous-discipline</option>
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

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          {viewMode === 'tree' ? (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Structure Hiérarchique des Catégories
              </h2>
              <TreeView 
                nodes={treeNodes} 
                searchable 
                showCounts 
                showIcons 
                maxHeight="500px" 
                showContextMenu={true}
                onNodeView={(node) => {
                  // Find the corresponding category data
                  const category = flatList.find(c => c.name_fr === node.label);
                  if (category) {
                    openModal('view', category);
                  }
                }}
                onNodeAdd={(node) => {
                  // Find the corresponding category data to use as parent
                  const parentCategory = flatList.find(c => c.name_fr === node.label);
                  if (parentCategory) {
                    const parentTreeNode = {
                      id: parentCategory.id,
                      name_fr: parentCategory.name_fr,
                      level: parentCategory.level
                    };
                    openModal('create', undefined, parentTreeNode);
                  }
                }}
                onNodeEdit={(node) => {
                  // Find the corresponding category data
                  const category = flatList.find(c => c.name_fr === node.label);
                  if (category) {
                    openModal('edit', category);
                  }
                }}
                onNodeDelete={(node) => {
                  // Find the corresponding category data
                  const category = flatList.find(c => c.name_fr === node.label);
                  if (category && confirm(`Êtes-vous sûr de vouloir supprimer "${node.label}" ?`)) {
                    handleDelete(category.id);
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
                      Catégorie
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Niveau
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
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
                  {displayedCategories.map((category) => {
                    const depth = (category as any).depth || 0;
                    return (
                      <tr key={category.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div style={{ marginLeft: `${depth * 20}px` }} className="flex items-center space-x-2">
                            {depth > 0 && (
                              <div className="flex items-center text-gray-300">
                                {'└─'.repeat(1)}
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {category.name_fr}
                              </div>
                              {(category.name_en || category.name_ar) && (
                                <div className="text-sm text-gray-500">
                                  {category.name_en && <span>{category.name_en}</span>}
                                  {category.name_en && category.name_ar && <span> • </span>}
                                  {category.name_ar && <span>{category.name_ar}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                            {category.code}
                          </code>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${getLevelColor(category.level)}`}>
                            {getLevelLabel(category.level)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {category.description || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(category.created_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => openModal('view', category)}
                              className="text-gray-400 hover:text-gray-600"
                              title="Voir les détails"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openModal('edit', category)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
                                  handleDelete(category.id);
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
                    );
                  })}
                </tbody>
              </table>
              
              {/* Show more button for list view */}
              {viewMode === 'list' && filteredCategories.length > 50 && !showAllCategories && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Affichage de 50 sur {filteredCategories.length} catégories
                    </p>
                    <button
                      onClick={() => setShowAllCategories(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <span>Afficher toutes les catégories</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              
              {viewMode === 'list' && showAllCategories && filteredCategories.length > 50 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Affichage de toutes les {filteredCategories.length} catégories
                    </p>
                    <button
                      onClick={() => setShowAllCategories(false)}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
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