import React, { useState, useEffect } from 'react';
import { 
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Building,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Move,
  GraduationCap,
  School,
  ListBulletIcon,
  TreeIcon
} from 'lucide-react';
import { apiService } from '../../services/api';
import AdminHeader from '../layout/AdminHeader';
import TreeView from '../ui/TreeView/TreeView';
import TreeSelect from '../ui/TreeSelect/TreeSelect';
import { TreeNode as UITreeNode } from '../../types/tree';
import { 
  UniversityResponse, 
  FacultyResponse, 
  DepartmentResponse,
  PaginatedResponse,
  UniversityCreate,
  UniversityUpdate,
  FacultyCreate,
  FacultyUpdate
} from '../../types/api';

interface TreeNode {
  id: string;
  name_fr: string;
  name_en?: string;
  name_ar?: string;
  type: 'university' | 'faculty' | 'department';
  level: number;
  parent_id?: string;
  children?: TreeNode[];
  expanded?: boolean;
  thesis_count?: number;
  is_active?: boolean;
}

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  type: 'university' | 'faculty';
  parent?: TreeNode;
  data?: UniversityResponse | FacultyResponse;
}

const AdminEtablissementsUniversitairesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('tree');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'university' | 'faculty'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'thesis_count'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showAllEntities, setShowAllEntities] = useState(false);
  
  const [universities, setUniversities] = useState<UniversityResponse[]>([]);
  const [faculties, setFaculties] = useState<FacultyResponse[]>([]);
  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
  const [treeNodes, setTreeNodes] = useState<UITreeNode[]>([]);
  const [flatList, setFlatList] = useState<TreeNode[]>([]);
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    mode: 'create',
    type: 'university'
  });

  // Form states
  const [formData, setFormData] = useState({
    name_fr: '',
    name_en: '',
    name_ar: '',
    acronym: '',
    website: '',
    email: '',
    phone: '',
    address: '',
    established_year: '',
    university_id: '',
    parent_university_id: '',
    parent_faculty_id: ''
  });

  useEffect(() => {
    loadData();
  }, [viewMode, searchTerm, filterType, sortBy, sortOrder, showAllEntities]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (viewMode === 'tree') {
        const [universitiesRes, facultiesRes, departmentsRes] = await Promise.all([
          apiService.getUniversities(),
          apiService.getFaculties(),
          apiService.getDepartments()
        ]);
        
        setUniversities(universitiesRes.data);
        setFaculties(facultiesRes.data);
        setDepartments(departmentsRes.data);
        
        const tree = buildUnifiedTree(universitiesRes.data, facultiesRes.data, departmentsRes.data);
        setTreeNodes(tree);
      } else {
        const params: Record<string, string | number> = {};
        if (searchTerm.trim()) {
          params.search = searchTerm.trim();
        }
        if (!showAllEntities) {
          params.limit = 50;
        }
        params.sort_by = sortBy;
        params.sort_order = sortOrder;

        const [universitiesRes, facultiesRes] = await Promise.all([
          apiService.getUniversities(params),
          apiService.getFaculties(params)
        ]);

        setUniversities(universitiesRes.data);
        setFaculties(facultiesRes.data);
        
        const flat = buildFlatList(universitiesRes.data, facultiesRes.data);
        setFlatList(flat);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildUnifiedTree = (universities: UniversityResponse[], faculties: FacultyResponse[], departments: DepartmentResponse[]): UITreeNode[] => {
    const nodesMap = new Map<string, UITreeNode>();
    const rootNodes: UITreeNode[] = [];

    // Add Universities
    universities.forEach(uni => {
      const node: UITreeNode = {
        id: uni.id,
        label: uni.name_fr,
        label_en: uni.name_en,
        label_ar: uni.name_ar,
        count: 0,
        type: 'university',
        level: 0,
        children: [],
        data: { ...uni, type: 'university' }
      };
      nodesMap.set(uni.id, node);
      rootNodes.push(node);
    });

    // Add Faculties
    faculties.forEach(faculty => {
      const node: UITreeNode = {
        id: faculty.id,
        label: faculty.name_fr,
        label_en: faculty.name_en,
        label_ar: faculty.name_ar,
        count: 0,
        type: 'faculty',
        level: 1,
        parentId: faculty.university_id,
        children: [],
        data: { ...faculty, type: 'faculty' }
      };
      nodesMap.set(faculty.id, node);
      const parent = nodesMap.get(faculty.university_id);
      if (parent) {
        parent.children!.push(node);
      }
    });

    // Add Departments
    departments.forEach(dept => {
      const node: UITreeNode = {
        id: dept.id,
        label: dept.name_fr,
        label_en: dept.name_en,
        label_ar: dept.name_ar,
        count: 0,
        type: 'department',
        level: 2,
        parentId: dept.faculty_id,
        children: [],
        data: { ...dept, type: 'department' }
      };
      nodesMap.set(dept.id, node);
      const parent = nodesMap.get(dept.faculty_id);
      if (parent) {
        parent.children!.push(node);
      }
    });

    // Sort children for consistent display
    nodesMap.forEach(node => {
      if (node.children) {
        node.children.sort((a, b) => a.label.localeCompare(b.label));
      }
    });

    rootNodes.sort((a, b) => a.label.localeCompare(b.label));
    return rootNodes;
  };

  const buildFlatList = (universities: UniversityResponse[], faculties: FacultyResponse[]): TreeNode[] => {
    const list: TreeNode[] = [];
    
    universities.forEach(uni => {
      list.push({
        id: uni.id,
        name_fr: uni.name_fr,
        name_en: uni.name_en,
        name_ar: uni.name_ar,
        type: 'university',
        level: 0,
        thesis_count: uni.thesis_count,
        is_active: uni.is_active
      });
    });

    faculties.forEach(faculty => {
      list.push({
        id: faculty.id,
        name_fr: faculty.name_fr,
        name_en: faculty.name_en,
        name_ar: faculty.name_ar,
        type: 'faculty',
        level: 1,
        parent_id: faculty.university_id,
        thesis_count: faculty.thesis_count,
        is_active: faculty.is_active
      });
    });

    return list.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'university' ? -1 : 1;
      }
      return a.name_fr.localeCompare(b.name_fr);
    });
  };

  const openModal = (mode: 'create' | 'edit' | 'view', type: 'university' | 'faculty', parent?: TreeNode, data?: UniversityResponse | FacultyResponse) => {
    setModal({ isOpen: true, mode, type, parent, data });
    
    if (mode === 'create') {
      setFormData({
        name_fr: '',
        name_en: '',
        name_ar: '',
        acronym: '',
        website: '',
        email: '',
        phone: '',
        address: '',
        established_year: '',
        university_id: parent?.id || '',
        parent_university_id: parent?.id || '',
        parent_faculty_id: ''
      });
    } else if (data) {
      setFormData({
        name_fr: data.name_fr,
        name_en: data.name_en || '',
        name_ar: data.name_ar || '',
        acronym: data.acronym || '',
        website: data.website || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        established_year: data.established_year?.toString() || '',
        university_id: 'university_id' in data ? data.university_id : '',
        parent_university_id: 'university_id' in data ? data.university_id : '',
        parent_faculty_id: ''
      });
    }
  };

  const closeModal = () => {
    setModal({ isOpen: false, mode: 'create', type: 'university' });
    setFormData({
      name_fr: '',
      name_en: '',
      name_ar: '',
      acronym: '',
      website: '',
      email: '',
      phone: '',
      address: '',
      established_year: '',
      university_id: '',
      parent_university_id: '',
      parent_faculty_id: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (modal.mode === 'create') {
        if (modal.type === 'university') {
          const universityData: UniversityCreate = {
            name_fr: formData.name_fr,
            name_en: formData.name_en || undefined,
            name_ar: formData.name_ar || undefined,
            acronym: formData.acronym || undefined,
            website: formData.website || undefined,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            address: formData.address || undefined,
            established_year: formData.established_year ? parseInt(formData.established_year) : undefined
          };
          await apiService.createUniversity(universityData);
        } else {
          const facultyData: FacultyCreate = {
            name_fr: formData.name_fr,
            name_en: formData.name_en || undefined,
            name_ar: formData.name_ar || undefined,
            acronym: formData.acronym || undefined,
            website: formData.website || undefined,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            address: formData.address || undefined,
            established_year: formData.established_year ? parseInt(formData.established_year) : undefined,
            university_id: formData.university_id
          };
          await apiService.createFaculty(facultyData);
        }
      } else if (modal.data) {
        if (modal.type === 'university') {
          const universityData: UniversityUpdate = {
            name_fr: formData.name_fr,
            name_en: formData.name_en || undefined,
            name_ar: formData.name_ar || undefined,
            acronym: formData.acronym || undefined,
            website: formData.website || undefined,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            address: formData.address || undefined,
            established_year: formData.established_year ? parseInt(formData.established_year) : undefined
          };
          await apiService.updateUniversity(modal.data.id, universityData);
        } else {
          const facultyData: FacultyUpdate = {
            name_fr: formData.name_fr,
            name_en: formData.name_en || undefined,
            name_ar: formData.name_ar || undefined,
            acronym: formData.acronym || undefined,
            website: formData.website || undefined,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            address: formData.address || undefined,
            established_year: formData.established_year ? parseInt(formData.established_year) : undefined,
            university_id: formData.university_id
          };
          await apiService.updateFaculty(modal.data.id, facultyData);
        }
      }
      
      closeModal();
      loadData();
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const handleDelete = async (id: string, type: 'university' | 'faculty') => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return;
    
    try {
      if (type === 'university') {
        await apiService.deleteUniversity(id);
      } else {
        await apiService.deleteFaculty(id);
      }
      loadData();
    } catch (error) {
      console.error('Error deleting data:', error);
    }
  };

  const getTypeIcon = (type: 'university' | 'faculty' | 'department') => {
    switch (type) {
      case 'university':
        return <Building className="w-5 h-5" />;
      case 'faculty':
        return <GraduationCap className="w-5 h-5" />;
      case 'department':
        return <School className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: 'university' | 'faculty' | 'department') => {
    switch (type) {
      case 'university':
        return 'Université';
      case 'faculty':
        return 'Faculté';
      case 'department':
        return 'Département';
    }
  };

  const getTypeColor = (type: 'university' | 'faculty' | 'department') => {
    switch (type) {
      case 'university':
        return 'bg-blue-100 text-blue-800';
      case 'faculty':
        return 'bg-green-100 text-green-800';
      case 'department':
        return 'bg-purple-100 text-purple-800';
    }
  };

  const filteredData = flatList.filter(item => {
    const matchesSearch = !searchTerm || 
      item.name_fr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.name_en && item.name_en.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.name_ar && item.name_ar.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterType === 'all' || item.type === filterType;
    
    return matchesSearch && matchesFilter;
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
              <h1 className="text-3xl font-bold text-gray-900">Établissements Universitaires</h1>
              <p className="text-gray-600 mt-2">
                Gérer les universités, facultés et départements
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <ListBulletIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('tree')}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    viewMode === 'tree' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <TreeIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => openModal('create', 'university')}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nouvelle Université</span>
                </button>
                <button
                  onClick={() => openModal('create', 'faculty')}
                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nouvelle Faculté</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <Building className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Universités</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {universities.length.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Facultés</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {faculties.length.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <School className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Départements</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {departments.length.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tree View */}
        {viewMode === 'tree' && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Structure hiérarchique des établissements universitaires</h2>
              <TreeView
                data={treeNodes}
                onNodeSelect={(node) => {
                  const type = node.data?.type || 'university';
                  if (type === 'university') {
                    const university = universities.find(u => u.id === node.id);
                    if (university) {
                      openModal('view', 'university', undefined, university);
                    }
                  } else if (type === 'faculty') {
                    const faculty = faculties.find(f => f.id === node.id);
                    if (faculty) {
                      openModal('view', 'faculty', undefined, faculty);
                    }
                  }
                }}
                showContextMenu={true}
                onNodeView={(node) => {
                  const type = node.data?.type || 'university';
                  if (type === 'university') {
                    const university = universities.find(u => u.id === node.id);
                    if (university) {
                      openModal('view', 'university', undefined, university);
                    }
                  } else if (type === 'faculty') {
                    const faculty = faculties.find(f => f.id === node.id);
                    if (faculty) {
                      openModal('view', 'faculty', undefined, faculty);
                    }
                  }
                }}
                onNodeAdd={(node) => {
                  const type = node.data?.type || 'university';
                  if (type === 'university') {
                    const university = universities.find(u => u.id === node.id);
                    if (university) {
                      openModal('create', 'faculty', { ...node, type: 'university' as const });
                    }
                  }
                }}
                onNodeEdit={(node) => {
                  const type = node.data?.type || 'university';
                  if (type === 'university') {
                    const university = universities.find(u => u.id === node.id);
                    if (university) {
                      openModal('edit', 'university', undefined, university);
                    }
                  } else if (type === 'faculty') {
                    const faculty = faculties.find(f => f.id === node.id);
                    if (faculty) {
                      openModal('edit', 'faculty', undefined, faculty);
                    }
                  }
                }}
                onNodeDelete={(node) => {
                  const type = node.data?.type || 'university';
                  if (type === 'university') {
                    handleDelete(node.id, 'university');
                  } else if (type === 'faculty') {
                    handleDelete(node.id, 'faculty');
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Controls */}
            <div className="p-4 border-b border-gray-200">
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
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as 'all' | 'university' | 'faculty')}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Tous les types</option>
                    <option value="university">Universités</option>
                    <option value="faculty">Facultés</option>
                  </select>
                </div>
                <div className="text-sm text-gray-600">
                  {filteredData.length} établissement{filteredData.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Table */}
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
                      Parent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thèses
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
                  {filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                              {getTypeIcon(item.type)}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {item.name_fr}
                            </div>
                            {(item.name_en || item.name_ar) && (
                              <div className="text-sm text-gray-500">
                                {item.name_en && <span>{item.name_en}</span>}
                                {item.name_en && item.name_ar && <span> • </span>}
                                {item.name_ar && <span>{item.name_ar}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(item.type)}`}>
                          {getTypeLabel(item.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.parent_id ? (
                          (() => {
                            const parent = item.type === 'faculty' 
                              ? universities.find(u => u.id === item.parent_id)
                              : faculties.find(f => f.id === item.parent_id);
                            return parent ? parent.name_fr : '-';
                          })()
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.thesis_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {item.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              if (item.type === 'university') {
                                const university = universities.find(u => u.id === item.id);
                                if (university) {
                                  openModal('view', 'university', undefined, university);
                                }
                              } else {
                                const faculty = faculties.find(f => f.id === item.id);
                                if (faculty) {
                                  openModal('view', 'faculty', undefined, faculty);
                                }
                              }
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (item.type === 'university') {
                                const university = universities.find(u => u.id === item.id);
                                if (university) {
                                  openModal('edit', 'university', undefined, university);
                                }
                              } else {
                                const faculty = faculties.find(f => f.id === item.id);
                                if (faculty) {
                                  openModal('edit', 'faculty', undefined, faculty);
                                }
                              }
                            }}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.type)}
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
                  <Building className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">
                    {searchTerm ? 'Aucun établissement trouvé pour cette recherche' : 'Aucun établissement trouvé'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal */}
        {modal.isOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {modal.mode === 'create' && `Nouvelle ${getTypeLabel(modal.type)}`}
                    {modal.mode === 'edit' && `Modifier ${getTypeLabel(modal.type)}`}
                    {modal.mode === 'view' && `Détails ${getTypeLabel(modal.type)}`}
                  </h3>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {modal.mode !== 'view' ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nom (Français) *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name_fr}
                        onChange={(e) => setFormData({ ...formData, name_fr: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nom (Anglais)
                      </label>
                      <input
                        type="text"
                        value={formData.name_en}
                        onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nom (Arabe)
                      </label>
                      <input
                        type="text"
                        value={formData.name_ar}
                        onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Acronyme
                      </label>
                      <input
                        type="text"
                        value={formData.acronym}
                        onChange={(e) => setFormData({ ...formData, acronym: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {modal.type === 'faculty' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Université *
                        </label>
                        <TreeSelect
                          data={treeNodes.filter(node => node.type === 'university')}
                          value={formData.university_id}
                          onChange={(value) => setFormData({ ...formData, university_id: value })}
                          placeholder="Sélectionner une université"
                          maxSelections={1}
                        />
                      </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                      >
                        {modal.mode === 'create' ? 'Créer' : 'Modifier'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nom (Français)</label>
                      <p className="mt-1 text-sm text-gray-900">{formData.name_fr}</p>
                    </div>
                    {formData.name_en && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Nom (Anglais)</label>
                        <p className="mt-1 text-sm text-gray-900">{formData.name_en}</p>
                      </div>
                    )}
                    {formData.name_ar && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Nom (Arabe)</label>
                        <p className="mt-1 text-sm text-gray-900">{formData.name_ar}</p>
                      </div>
                    )}
                    {formData.acronym && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Acronyme</label>
                        <p className="mt-1 text-sm text-gray-900">{formData.acronym}</p>
                      </div>
                    )}
                    <div className="flex justify-end pt-4">
                      <button
                        onClick={closeModal}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminEtablissementsUniversitairesPage;