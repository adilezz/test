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
import { 
  UniversityResponse, 
  FacultyResponse, 
  DepartmentResponse,
  TreeNodeData,
  PaginatedResponse,
  UniversityCreate,
  UniversityUpdate,
  GeographicEntityResponse
} from '../../types/api';

interface TreeNode {
  id: string;
  name_fr: string;
  name_en?: string;
  name_ar?: string;
  acronym?: string;
  type: 'university' | 'faculty' | 'department';
  children?: TreeNode[];
  thesis_count?: number;
  expanded?: boolean;
  parent_id?: string;
}

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'delete' | 'view';
  item?: UniversityResponse;
}

export default function AdminUniversitiesPage() {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [flatList, setFlatList] = useState<UniversityResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [modal, setModal] = useState<ModalState>({ isOpen: false, mode: 'create' });
  const [geoEntities, setGeoEntities] = useState<GeographicEntityResponse[]>([]);
  const [formData, setFormData] = useState<UniversityCreate>({
    name_fr: '',
    name_en: '',
    name_ar: '',
    acronym: '',
    geographic_entities_id: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Load geographic entities for selector
    (async () => {
      try {
        const res = await apiService.adminList<PaginatedResponse>('geographic_entities', { limit: 1000 });
        setGeoEntities((res.data || []) as unknown as GeographicEntityResponse[]);
      } catch (error) {
        console.error('Error loading geographic entities:', error);
      }
    })();
  }, []);

  useEffect(() => {
    // Reload when switching views
    loadData();
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== 'list') return;
    const t = setTimeout(() => loadData(), 300);
    return () => clearTimeout(t);
  }, [searchTerm, viewMode]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (viewMode === 'tree') {
        const treeResponse = await apiService.getUniversitiesTree(true, 5);
        setTreeData(transformToTreeNodes(treeResponse as any));
      } else {
        const params: Record<string, string | number> = {};
        if (searchTerm && searchTerm.trim().length > 0) {
          params.search = searchTerm.trim();
        }
        const listResponse = await apiService.adminList<PaginatedResponse>('universities', params);
        setFlatList((listResponse.data || []) as UniversityResponse[]);
      }
    } catch (error) {
      console.error('Error loading universities:', error);
    } finally {
      setLoading(false);
    }
  };

  const transformToTreeNodes = (data: any[]): TreeNode[] => {
    return (data || []).map((item: any) => ({
      id: item.id,
      name_fr: item.name_fr,
      name_en: item.name_en,
      name_ar: item.name_ar,
      acronym: item.acronym,
      type: 'university',
      thesis_count: item.thesis_count,
      expanded: false,
      children: (item.faculties || []).map((faculty: any) => ({
        id: faculty.id,
        name_fr: faculty.name_fr,
        name_en: faculty.name_en,
        name_ar: faculty.name_ar,
        acronym: faculty.acronym,
        type: 'faculty' as const,
        parent_id: item.id,
        thesis_count: faculty.thesis_count,
        expanded: false,
        children: (faculty.departments || []).map((dept: any) => ({
          id: dept.id,
          name_fr: dept.name_fr,
          name_en: dept.name_en,
          name_ar: dept.name_ar,
          acronym: dept.acronym,
          type: 'department' as const,
          parent_id: faculty.id,
          thesis_count: dept.thesis_count
        }))
      }))
    }));
  };

  const toggleNode = (nodeId: string) => {
    setTreeData(prev => {
      const toggleRecursive = (nodes: TreeNode[]): TreeNode[] =>
        nodes.map(n => ({
          ...n,
          expanded: n.id === nodeId ? !n.expanded : n.expanded,
          children: n.children ? toggleRecursive(n.children) : undefined
        }));
      return toggleRecursive(prev);
    });
  };

  const handleCreate = async () => {
    try {
      const payload: UniversityCreate = {
        name_fr: formData.name_fr.trim(),
        name_en: formData.name_en?.trim() || undefined,
        name_ar: formData.name_ar?.trim() || undefined,
        acronym: formData.acronym?.trim() || undefined,
        geographic_entities_id: formData.geographic_entities_id ? formData.geographic_entities_id : undefined
      };
      await apiService.adminCreate('universities', payload);
      setModal({ isOpen: false, mode: 'create' });
      setFormData({
        name_fr: '',
        name_en: '',
        name_ar: '',
        acronym: '',
        geographic_entities_id: ''
      });
      loadData();
    } catch (error) {
      console.error('Error creating university:', error);
    }
  };

  const handleUpdate = async () => {
    if (!modal.item) return;
    
    try {
      const payload: UniversityUpdate = {
        name_fr: formData.name_fr?.trim() || undefined,
        name_en: formData.name_en?.trim() || undefined,
        name_ar: formData.name_ar?.trim() || undefined,
        acronym: formData.acronym?.trim() || undefined,
        geographic_entities_id: formData.geographic_entities_id ? formData.geographic_entities_id : undefined
      };
      await apiService.adminUpdate('universities', modal.item.id, payload);
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

  const openModal = (mode: ModalState['mode'], item?: UniversityResponse) => {
    setModal({ isOpen: true, mode, item });
    const ensureDetails = async (id: string) => {
      try {
        const full = await apiService.adminGet<UniversityResponse>('universities', id);
        setModal({ isOpen: true, mode, item: full });
        if (mode === 'edit') {
          setFormData({
            name_fr: full.name_fr,
            name_en: full.name_en || '',
            name_ar: full.name_ar || '',
            acronym: full.acronym || '',
            geographic_entities_id: full.geographic_entities_id || ''
          });
        }
      } catch (e) {
        console.error('Failed to load university details', e);
      }
    };
    if (mode === 'edit' && item) {
      if (!(item as any).created_at) {
        ensureDetails(item.id);
      } else {
        setFormData({
          name_fr: item.name_fr,
          name_en: item.name_en || '',
          name_ar: item.name_ar || '',
          acronym: item.acronym || '',
          geographic_entities_id: item.geographic_entities_id || ''
        });
      }
    } else if (mode === 'view' && item) {
      if (!(item as any).created_at) {
        ensureDetails(item.id);
      }
    } else if (mode === 'create') {
      setFormData({
        name_fr: '',
        name_en: '',
        name_ar: '',
        acronym: '',
        geographic_entities_id: ''
      });
    }
  };

  const renderTreeNode = (node: TreeNode, path: number[] = [], depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = node.expanded;

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center space-x-2 py-2 px-3 hover:bg-gray-50 rounded-lg cursor-pointer ${
            selectedItems.includes(node.id) ? 'bg-blue-50 border border-blue-200' : ''
          }`}
          style={{ marginLeft: `${depth * 20}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleNode(node.id)}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
          ) : (
            <div className="w-6 h-6" />
          )}

          <div className="flex items-center space-x-2 flex-1">
            {node.type === 'university' && <Building2 className="w-4 h-4 text-blue-600" />}
            {node.type === 'faculty' && <GraduationCap className="w-4 h-4 text-green-600" />}
            {node.type === 'department' && <Users className="w-4 h-4 text-purple-600" />}
            
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">{node.name_fr}</span>
                {node.acronym && (
                  <span className="text-sm text-gray-500">({node.acronym})</span>
                )}
              </div>
              {(node.name_en || node.name_ar) && (
                <div className="text-sm text-gray-600">
                  {node.name_en && <span>{node.name_en}</span>}
                  {node.name_en && node.name_ar && <span> • </span>}
                  {node.name_ar && <span>{node.name_ar}</span>}
                </div>
              )}
            </div>

            {node.thesis_count !== undefined && (
              <span className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded">
                {node.thesis_count} thèses
              </span>
            )}

            {node.type === 'university' && (
              <div className="flex items-center space-x-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openModal('view', node as any);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openModal('edit', node as any);
                  }}
                  className="p-1 text-gray-400 hover:text-blue-600"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Êtes-vous sûr de vouloir supprimer cette université ?')) {
                      handleDelete(node.id);
                    }
                  }}
                  className="p-1 text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child) =>
              renderTreeNode(child, path, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

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
                  Entité géographique
                </label>
                <select
                  value={formData.geographic_entities_id}
                  onChange={(e) => setFormData({ ...formData, geographic_entities_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Aucune</option>
                  {geoEntities.map((g) => (
                    <option key={g.id} value={g.id}>{g.name_fr}</option>
                  ))}
                </select>
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
                  placeholder="Rechercher... (nom, acronyme)"
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
                Structure Hiérarchique
              </h2>
              <div className="space-y-1">
                {treeData.map((node) => renderTreeNode(node, []))}
              </div>
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
                  {flatList.map((university) => (
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
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openModal('edit', university)}
                            className="text-blue-600 hover:text-blue-900"
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
          )}
        </div>

        {renderModal()}
      </div>
    </div>
  );
}