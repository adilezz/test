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
import { Link, useSearchParams } from 'react-router-dom';
import { apiService } from '../../services/api';
import TreeView from '../ui/TreeView/TreeView';
import { TreeNode as UITreeNode } from '../../types/tree';
import AdminHeader from '../layout/AdminHeader';
import { 
  DepartmentResponse, 
  FacultyResponse,
  SchoolResponse,
  UniversityResponse,
  TreeNodeData,
  PaginatedResponse,
  DepartmentCreate,
  DepartmentUpdate
} from '../../types/api';

interface TreeNode {
  id: string;
  name_fr: string;
  name_en?: string;
  name_ar?: string;
  type: 'faculty' | 'school' | 'department';
  children?: TreeNode[];
  thesis_count?: number;
  expanded?: boolean;
  parent_id?: string;
}

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'delete' | 'view';
  item?: DepartmentResponse;
}

export default function AdminDepartmentsPage() {
  const [searchParams] = useSearchParams();
  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [faculties, setFaculties] = useState<FacultyResponse[]>([]);
  const [schools, setSchools] = useState<SchoolResponse[]>([]);
  const [universities, setUniversities] = useState<UniversityResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [modal, setModal] = useState<ModalState>({ isOpen: false, mode: 'create' });
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    faculty_id: '',
    school_id: '',
    has_theses: ''
  });
  const [formData, setFormData] = useState<DepartmentCreate>({
    faculty_id: '',
    school_id: '',
    name_fr: '',
    name_en: '',
    name_ar: ''
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState({
    total: 0,
    withTheses: 0,
    byFaculty: {} as Record<string, number>,
    bySchool: {} as Record<string, number>
  });

  useEffect(() => {
    loadData();
    loadFaculties();
    loadSchools();
    loadUniversities();
    
    // Check if faculty_id or school_id is provided in URL params
    const facultyId = searchParams.get('faculty_id');
    const schoolId = searchParams.get('school_id');
    if (facultyId) {
      setFilters(prev => ({ ...prev, faculty_id: facultyId }));
    }
    if (schoolId) {
      setFilters(prev => ({ ...prev, school_id: schoolId }));
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, filters, page, viewMode]);

  const loadFaculties = async () => {
    try {
      const response = await apiService.adminList<PaginatedResponse>('faculties', { load_all: 'true' });
      setFaculties(response.data || []);
    } catch (error) {
      console.error('Error loading faculties:', error);
    }
  };

  const loadSchools = async () => {
    try {
      const response = await apiService.adminList<PaginatedResponse>('schools', { load_all: 'true' });
      setSchools(response.data || []);
    } catch (error) {
      console.error('Error loading schools:', error);
    }
  };

  const loadUniversities = async () => {
    try {
      const response = await apiService.adminList<PaginatedResponse>('universities', { load_all: 'true' });
      setUniversities(response.data || []);
    } catch (error) {
      console.error('Error loading universities:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (viewMode === 'tree') {
        // Load tree data - departments can be under faculties or schools
        const facultyTreeResponse = await apiService.getAdminReferencesTree({
          ref_type: 'universities',
          start_level: 'faculty',
          stop_level: 'department',
          include_counts: true
        });
        const schoolTreeResponse = await apiService.getAdminReferencesTree({
          ref_type: 'schools',
          start_level: 'school',
          stop_level: 'department',
          include_counts: true
        });
        
        const combinedTreeData = [
          ...transformToTreeNodes(facultyTreeResponse, 'faculty'),
          ...transformToTreeNodes(schoolTreeResponse, 'school')
        ];
        setTreeData(combinedTreeData);
      } else {
        // Load list data
        const params: Record<string, string | number> = {
          page,
          limit: 20
        };
        
        if (searchTerm.trim()) {
          params.search = searchTerm.trim();
        }
        if (filters.faculty_id) {
          params.faculty_id = filters.faculty_id;
        }
        if (filters.school_id) {
          params.school_id = filters.school_id;
        }
        if (filters.has_theses) {
          params.has_theses = filters.has_theses;
        }

        const response = await apiService.adminList<PaginatedResponse>('departments', params);
        setDepartments(response.data || []);
        
        if (response.meta) {
          setTotalPages(response.meta.pages);
          setStatistics(prev => ({
            ...prev,
            total: response.meta.total
          }));
        }
      }
    } catch (error: any) {
      console.error('Error loading departments:', error);
      setError(error.message || 'Erreur lors du chargement des départements');
    } finally {
      setLoading(false);
    }
  };

  const transformToTreeNodes = (data: any[], parentType: 'faculty' | 'school'): TreeNode[] => {
    const mapParent = (parent: any): TreeNode => ({
      id: parent.id,
      name_fr: parent.name_fr,
      name_en: parent.name_en,
      name_ar: parent.name_ar,
      type: parentType,
      thesis_count: parent.thesis_count,
      expanded: false,
      children: (parent.departments || []).map(mapDepartment)
    });
    const mapDepartment = (d: any): TreeNode => ({
      id: d.id,
      name_fr: d.name_fr,
      name_en: d.name_en,
      name_ar: d.name_ar,
      type: 'department',
      parent_id: d.parent_id,
      thesis_count: d.thesis_count
    });
    return data.map((node: any) => mapParent(node));
  };

  const handleCreate = async () => {
    try {
      setError(null);
      // Clean form data before sending
      const cleanData = {
        ...formData,
        name_en: formData.name_en || undefined,
        name_ar: formData.name_ar || undefined,
        faculty_id: formData.faculty_id || undefined,
        school_id: formData.school_id || undefined
      };
      
      await apiService.adminCreate('departments', cleanData);
      setModal({ isOpen: false, mode: 'create' });
      setFormData({
        faculty_id: '',
        school_id: '',
        name_fr: '',
        name_en: '',
        name_ar: ''
      });
      loadData();
    } catch (error: any) {
      console.error('Error creating department:', error);
      setError(error.message || 'Erreur lors de la création du département');
    }
  };

  const handleUpdate = async () => {
    if (!modal.item) return;
    
    try {
      setError(null);
      // Clean form data before sending
      const cleanData = {
        ...formData,
        name_en: formData.name_en || undefined,
        name_ar: formData.name_ar || undefined,
        faculty_id: formData.faculty_id || undefined,
        school_id: formData.school_id || undefined
      };
      
      await apiService.adminUpdate('departments', modal.item.id, cleanData);
      setModal({ isOpen: false, mode: 'edit' });
      loadData();
    } catch (error: any) {
      console.error('Error updating department:', error);
      setError(error.message || 'Erreur lors de la mise à jour du département');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setError(null);
      await apiService.adminDelete('departments', id);
      loadData();
    } catch (error: any) {
      console.error('Error deleting department:', error);
      setError(error.message || 'Erreur lors de la suppression du département');
    }
  };

  const openModal = (mode: ModalState['mode'], item?: DepartmentResponse) => {
    setError(null);
    setModal({ isOpen: true, mode, item });
    if (mode === 'edit' && item) {
      setFormData({
        faculty_id: item.faculty_id || '',
        school_id: item.school_id || '',
        name_fr: item.name_fr,
        name_en: item.name_en || '',
        name_ar: item.name_ar || ''
      });
    } else if (mode === 'create') {
      // Pre-select faculty or school if filtering by one
      const preSelectedFaculty = filters.faculty_id || searchParams.get('faculty_id') || '';
      const preSelectedSchool = filters.school_id || searchParams.get('school_id') || '';
      setFormData({
        faculty_id: preSelectedFaculty,
        school_id: preSelectedSchool,
        name_fr: '',
        name_en: '',
        name_ar: ''
      });
    }
  };

  const getFacultyName = (facultyId: string) => {
    const faculty = faculties.find(f => f.id === facultyId);
    return faculty?.name_fr || 'Faculté inconnue';
  };

  const getSchoolName = (schoolId: string) => {
    const school = schools.find(s => s.id === schoolId);
    return school?.name_fr || 'École inconnue';
  };

  const toggleNode = (nodeId: string, path: number[] = []) => {
    setTreeData(prev => {
      const newData = [...prev];
      let current = newData;
      
      for (let i = 0; i < path.length; i++) {
        current = current[path[i]].children!;
      }
      
      const nodeIndex = current.findIndex(node => node.id === nodeId);
      if (nodeIndex !== -1) {
        current[nodeIndex] = {
          ...current[nodeIndex],
          expanded: !current[nodeIndex].expanded
        };
      }
      
      return newData;
    });
  };

  const renderTreeNode = (node: TreeNode, path: number[] = [], depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = node.expanded;

    return (
      <div key={node.id} className="select-none">
        <div
          className="flex items-center space-x-2 py-2 px-3 hover:bg-gray-50 rounded-lg group"
          style={{ marginLeft: `${depth * 20}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleNode(node.id, path)}
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
            {node.type === 'faculty' && <GraduationCap className="w-4 h-4 text-green-600" />}
            {node.type === 'school' && <School className="w-4 h-4 text-blue-600" />}
            {node.type === 'department' && <Users className="w-4 h-4 text-purple-600" />}
            
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">{node.name_fr}</span>
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

            {node.type === 'department' && (
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openModal('view', node as any);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="Voir les détails"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openModal('edit', node as any);
                  }}
                  className="p-1 text-gray-400 hover:text-blue-600"
                  title="Modifier"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Êtes-vous sûr de vouloir supprimer ce département ?')) {
                      handleDelete(node.id);
                    }
                  }}
                  className="p-1 text-gray-400 hover:text-red-600"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child, index) =>
              renderTreeNode(child, [...path, index], depth + 1)
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
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {modal.mode === 'create' && 'Nouveau Département'}
              {modal.mode === 'edit' && 'Modifier Département'}
              {modal.mode === 'view' && 'Détails Département'}
              {modal.mode === 'delete' && 'Supprimer Département'}
            </h2>
            <button
              onClick={() => setModal({ isOpen: false, mode: 'create' })}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {(modal.mode === 'create' || modal.mode === 'edit') && (
            <form onSubmit={(e) => {
              e.preventDefault();
              modal.mode === 'create' ? handleCreate() : handleUpdate();
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Faculté
                  </label>
                  <select
                    value={formData.faculty_id}
                    onChange={(e) => setFormData({ ...formData, faculty_id: e.target.value, school_id: '' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner une faculté</option>
                    {faculties.map((faculty) => (
                      <option key={faculty.id} value={faculty.id}>
                        {faculty.name_fr} {faculty.acronym && `(${faculty.acronym})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    École
                  </label>
                  <select
                    value={formData.school_id}
                    onChange={(e) => setFormData({ ...formData, school_id: e.target.value, faculty_id: '' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner une école</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name_fr} {school.acronym && `(${school.acronym})`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800">
                    Un département doit être associé à une faculté OU une école, pas les deux.
                  </span>
                </div>
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
                  <label className="block text-sm font-medium text-gray-700">Faculté</label>
                  <p className="mt-1 text-gray-900">
                    {modal.item.faculty_id ? getFacultyName(modal.item.faculty_id) : '-'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">École</label>
                  <p className="mt-1 text-gray-900">
                    {modal.item.school_id ? getSchoolName(modal.item.school_id) : '-'}
                  </p>
                </div>
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

  if (loading && departments.length === 0 && treeData.length === 0) {
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
              <h1 className="text-3xl font-bold text-gray-900">Départements</h1>
              <p className="text-gray-600 mt-2">
                Gérer les départements des facultés et écoles
              </p>
            </div>
            <button
              onClick={() => openModal('create')}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Département</span>
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <Users className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Départements</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {statistics.total.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avec Thèses</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {statistics.withTheses.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Facultés</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {Object.keys(statistics.byFaculty).length.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                <School className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Écoles</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {Object.keys(statistics.bySchool).length.toLocaleString()}
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
            
            <div className="flex items-center space-x-3">
              <Link
                to="/admin/faculties"
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Gérer Facultés</span>
              </Link>
              <Link
                to="/admin/schools"
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <School className="w-4 h-4" />
                <span>Gérer Écoles</span>
              </Link>
              
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
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filtres</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Faculté
                </label>
                <select
                  value={filters.faculty_id}
                  onChange={(e) => setFilters({ ...filters, faculty_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Toutes les facultés</option>
                  {faculties.map((faculty) => (
                    <option key={faculty.id} value={faculty.id}>
                      {faculty.name_fr} {faculty.acronym && `(${faculty.acronym})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  École
                </label>
                <select
                  value={filters.school_id}
                  onChange={(e) => setFilters({ ...filters, school_id: e.target.value })}
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
                onClick={() => setFilters({ faculty_id: '', school_id: '', has_theses: '' })}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          {viewMode === 'tree' ? (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Structure Hiérarchique des Départements
              </h2>
              <div className="space-y-1">
                {treeData.length > 0 ? (
                  treeData.map((node, index) => renderTreeNode(node, [index]))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">Aucun département trouvé</p>
                    <p className="text-sm">Aucune donnée disponible</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Département
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Faculté
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      École
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
                  {departments.map((department) => (
                    <tr key={department.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {department.name_fr}
                          </div>
                          {(department.name_en || department.name_ar) && (
                            <div className="text-sm text-gray-500">
                              {department.name_en && <span>{department.name_en}</span>}
                              {department.name_en && department.name_ar && <span> • </span>}
                              {department.name_ar && <span>{department.name_ar}</span>}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {department.faculty_id ? getFacultyName(department.faculty_id) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {department.school_id ? getSchoolName(department.school_id) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(department.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openModal('view', department)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openModal('edit', department)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Êtes-vous sûr de vouloir supprimer ce département ?')) {
                                handleDelete(department.id);
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
              
              {departments.length === 0 && !loading && (
                <div className="px-6 py-12 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun département trouvé</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm || Object.values(filters).some(f => f) 
                      ? 'Aucun département ne correspond à vos critères de recherche.'
                      : 'Commencez par créer votre premier département.'
                    }
                  </p>
                  {!searchTerm && !Object.values(filters).some(f => f) && (
                    <button
                      onClick={() => openModal('create')}
                      className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Nouveau Département</span>
                    </button>
                  )}
                </div>
              )}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Page {page} sur {totalPages}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Précédent
                      </button>
                      <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Suivant
                      </button>
                    </div>
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