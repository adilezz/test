import React, { useState, useEffect } from 'react';
import { 
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Users,
  Building2,
  GraduationCap,
  School,
  Globe,
  UserPlus,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  AlertCircle,
  Grid3X3,
  List
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { apiService } from '../../services/api';
import TreeView from '../ui/TreeView/TreeView';
import { TreeNode as UITreeNode } from '../../types/tree';
import AdminHeader from '../layout/AdminHeader';
import { 
  AcademicPersonResponse,
  PaginatedResponse,
  AcademicPersonCreate,
  AcademicPersonUpdate,
  UniversityResponse,
  FacultyResponse,
  SchoolResponse
} from '../../types/api';

interface TreeNode {
  id: string;
  name_fr: string;
  name_en?: string;
  name_ar?: string;
  type: 'university' | 'faculty' | 'school' | 'person';
  children?: TreeNode[];
  person_count?: number;
  expanded?: boolean;
  parent_id?: string;
  title?: string;
  external_institution_name?: string;
}

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'delete' | 'view';
  item?: AcademicPersonResponse;
}

export default function AdminAcademicPersonsPage() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<AcademicPersonResponse[]>([]);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [universities, setUniversities] = useState<UniversityResponse[]>([]);
  const [faculties, setFaculties] = useState<FacultyResponse[]>([]);
  const [schools, setSchools] = useState<SchoolResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('list');
  const [showAllPersons, setShowAllPersons] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    university_id: '',
    faculty_id: '',
    school_id: '',
    title: '',
    is_external: ''
  });
  const [modal, setModal] = useState<ModalState>({ isOpen: false, mode: 'create' });
  const [formData, setFormData] = useState<AcademicPersonCreate>({
    complete_name_fr: undefined,
    complete_name_ar: undefined,
    first_name_fr: undefined,
    last_name_fr: undefined,
    first_name_ar: undefined,
    last_name_ar: undefined,
    title: undefined,
    university_id: undefined,
    faculty_id: undefined,
    school_id: undefined,
    external_institution_name: undefined,
    external_institution_country: undefined,
    external_institution_type: undefined,
    user_id: undefined
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statistics, setStatistics] = useState({
    total: 0,
    withExternalInstitution: 0,
    withUserAccount: 0,
    byUniversity: {} as Record<string, number>
  });

  useEffect(() => {
    loadData();
    loadUniversities();
    loadFaculties();
    loadSchools();
    
    // Check if filters are provided in URL params
    const universityId = searchParams.get('university_id');
    const facultyId = searchParams.get('faculty_id');
    const schoolId = searchParams.get('school_id');
    
    if (universityId || facultyId || schoolId) {
      setFilters(prev => ({
        ...prev,
        university_id: universityId || '',
        faculty_id: facultyId || '',
        school_id: schoolId || ''
      }));
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, filters, page]);

  // Show all persons effect
  useEffect(() => {
    if (viewMode === 'list') {
      loadData();
    }
  }, [showAllPersons]);

  const loadUniversities = async () => {
    try {
      const response = await apiService.adminList<PaginatedResponse>('universities', { load_all: 'true' });
      setUniversities(response.data || []);
    } catch (error) {
      console.error('Error loading universities:', error);
    }
  };

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

  const buildTreeData = (persons: AcademicPersonResponse[]): TreeNode[] => {
    const universityMap = new Map<string, TreeNode>();
    const facultyMap = new Map<string, TreeNode>();
    const schoolMap = new Map<string, TreeNode>();

    // Initialize university nodes
    universities.forEach(university => {
      universityMap.set(university.id, {
        id: university.id,
        name_fr: university.name_fr,
        name_en: university.name_en,
        name_ar: university.name_ar,
        type: 'university',
        children: [],
        person_count: 0,
        expanded: false
      });
    });

    // Initialize faculty nodes
    faculties.forEach(faculty => {
      facultyMap.set(faculty.id, {
        id: faculty.id,
        name_fr: faculty.name_fr,
        name_en: faculty.name_en,
        name_ar: faculty.name_ar,
        type: 'faculty',
        children: [],
        person_count: 0,
        expanded: false,
        parent_id: faculty.university_id
      });
    });

    // Initialize school nodes
    schools.forEach(school => {
      schoolMap.set(school.id, {
        id: school.id,
        name_fr: school.name_fr,
        name_en: school.name_en,
        name_ar: school.name_ar,
        type: 'school',
        children: [],
        person_count: 0,
        expanded: false,
        parent_id: school.parent_university_id
      });
    });

    // Add persons to appropriate nodes
    persons.forEach(person => {
      const personNode: TreeNode = {
        id: person.id,
        name_fr: person.complete_name_fr || 
                 (person.first_name_fr && person.last_name_fr ? `${person.first_name_fr} ${person.last_name_fr}` : '') ||
                 person.first_name_fr || person.last_name_fr || 'Nom non défini',
        name_ar: person.complete_name_ar,
        type: 'person',
        title: person.title,
        external_institution_name: person.external_institution_name
      };

      // Add to school if exists
      if (person.school_id && schoolMap.has(person.school_id)) {
        const school = schoolMap.get(person.school_id)!;
        school.children!.push(personNode);
        school.person_count! += 1;
      }
      // Add to faculty if exists
      else if (person.faculty_id && facultyMap.has(person.faculty_id)) {
        const faculty = facultyMap.get(person.faculty_id)!;
        faculty.children!.push(personNode);
        faculty.person_count! += 1;
      }
      // Add to university if exists
      else if (person.university_id && universityMap.has(person.university_id)) {
        const university = universityMap.get(person.university_id)!;
        university.children!.push(personNode);
        university.person_count! += 1;
      }
    });

    // Build hierarchy: schools -> faculties -> universities
    schoolMap.forEach(school => {
      if (school.parent_id && facultyMap.has(school.parent_id)) {
        const faculty = facultyMap.get(school.parent_id)!;
        faculty.children!.push(school);
        faculty.person_count! += school.person_count!;
      } else if (school.parent_id && universityMap.has(school.parent_id)) {
        const university = universityMap.get(school.parent_id)!;
        university.children!.push(school);
        university.person_count! += school.person_count!;
      }
    });

    facultyMap.forEach(faculty => {
      if (faculty.parent_id && universityMap.has(faculty.parent_id)) {
        const university = universityMap.get(faculty.parent_id)!;
        university.children!.push(faculty);
        university.person_count! += faculty.person_count!;
      }
    });

    // Return only universities with persons
    return Array.from(universityMap.values()).filter(uni => uni.person_count! > 0);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {};
      
      // Apply search term
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      
      // Apply filters
      if (filters.university_id) {
        params.university_id = filters.university_id;
      }
      if (filters.faculty_id) {
        params.faculty_id = filters.faculty_id;
      }
      if (filters.school_id) {
        params.school_id = filters.school_id;
      }
      if (filters.title) {
        params.title = filters.title;
      }
      if (filters.is_external) {
        params.is_external = filters.is_external;
      }
      
      // Apply pagination
      if (viewMode === 'list') {
        if (!showAllPersons) {
          params.limit = 20;
          params.page = page;
        } else {
          params.load_all = 'true';
        }
      } else {
        params.load_all = 'true';
      }
      
      console.log('Loading academic persons with params:', params);
      const response = await apiService.adminList<PaginatedResponse>('academic_persons', params);
      console.log('Academic persons response:', response);
      
      const persons = response.data || [];
      setData(persons);
      
      if (response.meta) {
        setTotalPages(response.meta.pages);
      }
      
      // Build tree data for tree view
      if (viewMode === 'tree') {
        const tree = buildTreeData(persons);
        setTreeData(tree);
      }
      
      // Calculate statistics
      setStatistics({
        total: persons.length,
        withExternalInstitution: persons.filter(p => p.external_institution_name).length,
        withUserAccount: persons.filter(p => p.user_id).length,
        byUniversity: persons.reduce((acc, person) => {
          if (person.university_id) {
            const uni = universities.find(u => u.id === person.university_id);
            const key = uni ? uni.name_fr : 'Autre';
            acc[key] = (acc[key] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>)
      });
      
    } catch (error) {
      console.error('Error loading academic persons:', error);
      if (error instanceof Error) {
        setError(`Erreur de connexion à l'API: ${error.message}`);
      } else {
        setError('Erreur inconnue lors du chargement des données');
      }
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    // Check if we have at least some name information
    const hasCompleteName = formData.complete_name_fr?.trim() || formData.complete_name_ar?.trim();
    const hasFirstLastName = (formData.first_name_fr?.trim() && formData.last_name_fr?.trim()) ||
                            (formData.first_name_ar?.trim() && formData.last_name_ar?.trim());
    
    if (!hasCompleteName && !hasFirstLastName) {
      setError('Au moins un nom complet ou prénom+nom (en français ou arabe) est requis');
      return false;
    }
    
    setError(null);
    return true;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    
    try {
      await apiService.adminCreate('academic_persons', formData);
      setModal({ isOpen: false, mode: 'create' });
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error creating academic person:', error);
      if (error instanceof Error) {
        setError(`Erreur lors de la création: ${error.message}`);
      } else {
        setError('Erreur inconnue lors de la création');
      }
    }
  };

  const handleUpdate = async () => {
    if (!modal.item) return;
    if (!validateForm()) return;
    
    try {
      await apiService.adminUpdate('academic_persons', modal.item.id, formData);
      setModal({ isOpen: false, mode: 'edit' });
      loadData();
    } catch (error) {
      console.error('Error updating academic person:', error);
      if (error instanceof Error) {
        setError(`Erreur lors de la mise à jour: ${error.message}`);
      } else {
        setError('Erreur inconnue lors de la mise à jour');
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiService.adminDelete('academic_persons', id);
      loadData();
    } catch (error) {
      console.error('Error deleting academic person:', error);
      if (error instanceof Error) {
        setError(`Erreur lors de la suppression: ${error.message}`);
      } else {
        setError('Erreur inconnue lors de la suppression');
      }
    }
  };

  // Context Menu Handlers
  const handleNodeView = (node: UITreeNode) => {
    const person = data.find((p: AcademicPersonResponse) => p.id === node.id);
    if (person) {
      setModal({ isOpen: true, mode: 'view', item: person });
    }
  };

  const handleNodeAdd = (node: UITreeNode) => {
    // Add a new academic person under this institution
    setFormData({
      complete_name_fr: '',
      complete_name_ar: '',
      first_name_fr: '',
      last_name_fr: '',
      first_name_ar: '',
      last_name_ar: '',
      title: '',
      university_id: node.type === 'university' ? node.id : undefined,
      school_id: node.type === 'school' ? node.id : undefined,
      external_institution_name: '',
      external_institution_country: '',
      external_institution_type: '',
      user_id: undefined
    });
    setModal({ isOpen: true, mode: 'create' });
  };

  const handleNodeEdit = (node: UITreeNode) => {
    const person = data.find((p: AcademicPersonResponse) => p.id === node.id);
    if (person) {
      setFormData({
        complete_name_fr: person.complete_name_fr || '',
        complete_name_ar: person.complete_name_ar || '',
        first_name_fr: person.first_name_fr || '',
        last_name_fr: person.last_name_fr || '',
        first_name_ar: person.first_name_ar || '',
        last_name_ar: person.last_name_ar || '',
        title: person.title || '',
        university_id: person.university_id || undefined,
        school_id: person.school_id || undefined,
        external_institution_name: person.external_institution_name || '',
        external_institution_country: person.external_institution_country || '',
        external_institution_type: person.external_institution_type || '',
        user_id: person.user_id || undefined
      });
      setModal({ isOpen: true, mode: 'edit', item: person });
    }
  };

  const handleNodeDelete = (node: UITreeNode) => {
    const person = data.find((p: AcademicPersonResponse) => p.id === node.id);
    if (person) {
      setModal({ isOpen: true, mode: 'delete', item: person });
    }
  };

  const resetForm = () => {
    setFormData({
      complete_name_fr: undefined,
      complete_name_ar: undefined,
      first_name_fr: undefined,
      last_name_fr: undefined,
      first_name_ar: undefined,
      last_name_ar: undefined,
      title: undefined,
      university_id: undefined,
      faculty_id: undefined,
      school_id: undefined,
      external_institution_name: undefined,
      external_institution_country: undefined,
      external_institution_type: undefined,
      user_id: undefined
    });
  };

  const openModal = (mode: ModalState['mode'], item?: AcademicPersonResponse) => {
    setModal({ isOpen: true, mode, item });
    
    if (mode === 'edit' && item) {
      setFormData({
        complete_name_fr: item.complete_name_fr || undefined,
        complete_name_ar: item.complete_name_ar || undefined,
        first_name_fr: item.first_name_fr || undefined,
        last_name_fr: item.last_name_fr || undefined,
        first_name_ar: item.first_name_ar || undefined,
        last_name_ar: item.last_name_ar || undefined,
        title: item.title || undefined,
        university_id: item.university_id || undefined,
        faculty_id: item.faculty_id || undefined,
        school_id: item.school_id || undefined,
        external_institution_name: item.external_institution_name || undefined,
        external_institution_country: item.external_institution_country || undefined,
        external_institution_type: item.external_institution_type || undefined,
        user_id: item.user_id || undefined
      });
    } else if (mode === 'create') {
      resetForm();
    }
  };

  const convertToUITreeNode = (node: TreeNode): UITreeNode => {
    const mapType = (t: TreeNode['type']): UITreeNode['type'] => {
      if (t === 'university') return 'university';
      if (t === 'faculty') return 'faculty';
      if (t === 'school') return 'school';
      // Fallback for person nodes to a supported type for iconography
      return 'department';
    };

    return {
      id: node.id,
      label: node.name_fr,
      type: mapType(node.type),
      children: node.children ? node.children.map(convertToUITreeNode) : undefined,
    } as UITreeNode;
  };

  const handleTreeNodeClick = (nodeId: string) => {
    const findAndUpdateNode = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, expanded: !node.expanded };
        }
        if (node.children) {
          return { ...node, children: findAndUpdateNode(node.children) };
        }
        return node;
      });
    };
    
    setTreeData(findAndUpdateNode(treeData));
  };

  const renderModal = () => {
    if (!modal.isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {modal.mode === 'create' && 'Nouvelle Personne Académique'}
              {modal.mode === 'edit' && 'Modifier Personne Académique'}
              {modal.mode === 'view' && 'Détails Personne Académique'}
              {modal.mode === 'delete' && 'Supprimer Personne Académique'}
            </h2>
            <button
              onClick={() => setModal({ isOpen: false, mode: 'create' })}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {modal.mode === 'delete' && modal.item && (
            <div className="space-y-4">
              <p className="text-gray-600">
                Êtes-vous sûr de vouloir supprimer cette personne académique ?
              </p>
              <div className="bg-gray-50 p-3 rounded">
                <p className="font-medium">
                  {modal.item.complete_name_fr || 
                   (modal.item.first_name_fr && modal.item.last_name_fr ? `${modal.item.first_name_fr} ${modal.item.last_name_fr}` : '') ||
                   modal.item.first_name_fr || modal.item.last_name_fr || 'Nom non défini'}
                </p>
                {modal.item.title && (
                  <p className="text-sm text-gray-600">{modal.item.title}</p>
                )}
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setModal({ isOpen: false, mode: 'create' })}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    handleDelete(modal.item!.id);
                    setModal({ isOpen: false, mode: 'create' });
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Supprimer
                </button>
              </div>
            </div>
          )}

          {(modal.mode === 'create' || modal.mode === 'edit') && (
            <form onSubmit={(e) => {
              e.preventDefault();
              modal.mode === 'create' ? handleCreate() : handleUpdate();
            }} className="space-y-6">
              
              {/* Names Section - French */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Informations Personnelles (Français)</h3>
                <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <strong>Note:</strong> Au moins un nom complet OU prénom+nom (en français ou arabe) est requis.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prénom (Français)
                    </label>
                    <input
                      type="text"
                      value={formData.first_name_fr || ''}
                      onChange={(e) => setFormData({ ...formData, first_name_fr: e.target.value || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom (Français)
                    </label>
                    <input
                      type="text"
                      value={formData.last_name_fr || ''}
                      onChange={(e) => setFormData({ ...formData, last_name_fr: e.target.value || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom Complet (Français)
                  </label>
                  <input
                    type="text"
                    value={formData.complete_name_fr || ''}
                    onChange={(e) => setFormData({ ...formData, complete_name_fr: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Si différent de Prénom + Nom"
                  />
                </div>
              </div>

              {/* Names Section - Arabic */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Informations Personnelles (Arabe)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prénom (Arabe)
                    </label>
                    <input
                      type="text"
                      value={formData.first_name_ar || ''}
                      onChange={(e) => setFormData({ ...formData, first_name_ar: e.target.value || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom (Arabe)
                    </label>
                    <input
                      type="text"
                      value={formData.last_name_ar || ''}
                      onChange={(e) => setFormData({ ...formData, last_name_ar: e.target.value || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      dir="rtl"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom Complet (Arabe)
                  </label>
                  <input
                    type="text"
                    value={formData.complete_name_ar || ''}
                    onChange={(e) => setFormData({ ...formData, complete_name_ar: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    dir="rtl"
                    placeholder="إذا كان مختلفاً عن الاسم + اللقب"
                  />
                </div>
              </div>

              {/* Title and Professional Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Informations Professionnelles</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titre
                  </label>
                  <select
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner un titre</option>
                    <option value="Prof">Prof</option>
                    <option value="Dr">Dr</option>
                    <option value="Pr">Pr</option>
                    <option value="Mr">Mr</option>
                    <option value="Mme">Mme</option>
                    <option value="Mlle">Mlle</option>
                  </select>
                </div>
              </div>

              {/* Institutional Affiliation */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Affiliation Institutionnelle</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Université
                    </label>
                    <select
                      value={formData.university_id || ''}
                      onChange={(e) => setFormData({ ...formData, university_id: e.target.value || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sélectionner une université</option>
                      {universities.map((university) => (
                        <option key={university.id} value={university.id}>
                          {university.name_fr}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Faculté
                    </label>
                    <select
                      value={formData.faculty_id || ''}
                      onChange={(e) => setFormData({ ...formData, faculty_id: e.target.value || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sélectionner une faculté</option>
                      {faculties.map((faculty) => (
                        <option key={faculty.id} value={faculty.id}>
                          {faculty.name_fr}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      École
                    </label>
                    <select
                      value={formData.school_id || ''}
                      onChange={(e) => setFormData({ ...formData, school_id: e.target.value || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sélectionner une école</option>
                      {schools.map((school) => (
                        <option key={school.id} value={school.id}>
                          {school.name_fr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* External Institution */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Institution Externe</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom de l'Institution
                    </label>
                    <input
                      type="text"
                      value={formData.external_institution_name || ''}
                      onChange={(e) => setFormData({ ...formData, external_institution_name: e.target.value || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nom de l'institution externe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pays
                    </label>
                    <input
                      type="text"
                      value={formData.external_institution_country || ''}
                      onChange={(e) => setFormData({ ...formData, external_institution_country: e.target.value || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Pays de l'institution"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type d'Institution
                    </label>
                    <select
                      value={formData.external_institution_type || ''}
                      onChange={(e) => setFormData({ ...formData, external_institution_type: e.target.value || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sélectionner le type</option>
                      <option value="Université">Université</option>
                      <option value="École">École</option>
                      <option value="Institut">Institut</option>
                      <option value="Centre de recherche">Centre de recherche</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* User Association */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Association Utilisateur</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ID Utilisateur (optionnel)
                  </label>
                  <input
                    type="text"
                    value={formData.user_id || ''}
                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="UUID de l'utilisateur associé"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Laisser vide si cette personne n'a pas de compte utilisateur
                  </p>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nom complet (Français)</label>
                  <p className="mt-1 text-gray-900">
                    {modal.item.complete_name_fr || 
                     (modal.item.first_name_fr && modal.item.last_name_fr ? `${modal.item.first_name_fr} ${modal.item.last_name_fr}` : '') ||
                     modal.item.first_name_fr || modal.item.last_name_fr || 'Non défini'}
                  </p>
                </div>
                {modal.item.complete_name_ar && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nom complet (Arabe)</label>
                    <p className="mt-1 text-gray-900" dir="rtl">
                      {modal.item.complete_name_ar}
                    </p>
                  </div>
                )}
                {modal.item.title && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Titre</label>
                    <p className="mt-1 text-gray-900">{modal.item.title}</p>
                  </div>
                )}
                {modal.item.external_institution_name && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Institution externe</label>
                    <p className="mt-1 text-gray-900">
                      {modal.item.external_institution_name}
                      {modal.item.external_institution_country && (
                        <span className="text-gray-500"> ({modal.item.external_institution_country})</span>
                      )}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Créé le</label>
                  <p className="mt-1 text-gray-900">
                    {new Date(modal.item.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mis à jour le</label>
                  <p className="mt-1 text-gray-900">
                    {new Date(modal.item.updated_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
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
              <h1 className="text-3xl font-bold text-gray-900">Personnes Académiques</h1>
              <p className="text-gray-600 mt-2">
                Gérer les auteurs, directeurs de thèse et membres de jury
              </p>
            </div>
            <button
              onClick={() => openModal('create')}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <UserPlus className="w-4 h-4" />
              <span>Nouvelle Personne</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <Users className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Personnes</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {statistics.total.toLocaleString()}
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
                <p className="text-sm font-medium text-gray-600">Institution Externe</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {statistics.withExternalInstitution.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <UserPlus className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avec Compte</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {statistics.withUserAccount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Universités</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {Object.keys(statistics.byUniversity).length.toLocaleString()}
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
                  placeholder="Rechercher par nom, titre, institution..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80"
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

            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('tree')}
                  className={`px-3 py-2 rounded-lg ${
                    viewMode === 'tree' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 rounded-lg ${
                    viewMode === 'list' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <div className="text-sm text-gray-600">
                {data.length} personne{data.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filtres</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Université
                </label>
                <select
                  value={filters.university_id}
                  onChange={(e) => setFilters({ ...filters, university_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Toutes les universités</option>
                  {universities.map((university) => (
                    <option key={university.id} value={university.id}>
                      {university.name_fr}
                    </option>
                  ))}
                </select>
              </div>

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
                      {faculty.name_fr}
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
                      {school.name_fr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre
                </label>
                <select
                  value={filters.title}
                  onChange={(e) => setFilters({ ...filters, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Tous les titres</option>
                  <option value="Prof">Prof</option>
                  <option value="Dr">Dr</option>
                  <option value="Pr">Pr</option>
                  <option value="Mr">Mr</option>
                  <option value="Mme">Mme</option>
                  <option value="Mlle">Mlle</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Institution
                </label>
                <select
                  value={filters.is_external}
                  onChange={(e) => setFilters({ ...filters, is_external: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Toutes</option>
                  <option value="false">Interne</option>
                  <option value="true">Externe</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setFilters({ university_id: '', faculty_id: '', school_id: '', title: '', is_external: '' })}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Erreur</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    loadData();
                  }}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Réessayer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          {viewMode === 'tree' ? (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Structure Hiérarchique des Personnes Académiques
              </h2>
              {treeData.length > 0 ? (
                <TreeView
                  nodes={treeData.map(convertToUITreeNode)}
                  searchable
                  showCounts={false}
                  showIcons
                  maxHeight="500px"
                  showContextMenu={true}
                  onNodeView={handleNodeView}
                  onNodeAdd={handleNodeAdd}
                  onNodeEdit={handleNodeEdit}
                  onNodeDelete={handleNodeDelete}
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Aucune personne académique trouvée</p>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Personne
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Titre / Institution
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Affiliation
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
                  {data.map((person) => (
                    <tr key={person.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {((person.first_name_fr?.charAt(0) || '') + (person.last_name_fr?.charAt(0) || '')).toUpperCase() || 'NN'}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {person.complete_name_fr || 
                               (person.first_name_fr && person.last_name_fr ? `${person.first_name_fr} ${person.last_name_fr}` : '') ||
                               person.first_name_fr || person.last_name_fr || 'Nom non défini'}
                            </div>
                            {person.complete_name_ar && (
                              <div className="text-xs text-gray-500" dir="rtl">
                                {person.complete_name_ar}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {person.title && (
                            <div className="text-blue-600 font-medium">
                              {person.title}
                            </div>
                          )}
                          {person.external_institution_name && (
                            <div className="text-gray-600 mt-1 flex items-center">
                              <Globe className="w-3 h-3 mr-1" />
                              <span className="truncate">{person.external_institution_name}</span>
                            </div>
                          )}
                          {!person.title && !person.external_institution_name && (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {person.university_id && (
                            <div className="flex items-center space-x-1">
                              <Building2 className="w-3 h-3" />
                              <span>{universities.find(u => u.id === person.university_id)?.name_fr || 'Université'}</span>
                            </div>
                          )}
                          {person.faculty_id && (
                            <div className="flex items-center space-x-1 text-gray-600 mt-1">
                              <GraduationCap className="w-3 h-3" />
                              <span>{faculties.find(f => f.id === person.faculty_id)?.name_fr || 'Faculté'}</span>
                            </div>
                          )}
                          {person.school_id && (
                            <div className="flex items-center space-x-1 text-gray-600 mt-1">
                              <School className="w-3 h-3" />
                              <span>{schools.find(s => s.id === person.school_id)?.name_fr || 'École'}</span>
                            </div>
                          )}
                          {!person.university_id && !person.faculty_id && !person.school_id && (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(person.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openModal('view', person)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openModal('edit', person)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openModal('delete', person)}
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

              {data.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">
                    {searchTerm ? 'Aucune personne trouvée pour cette recherche' : 'Aucune personne académique trouvée'}
                  </p>
                </div>
              )}

              {/* Pagination and Show All Button */}
              {viewMode === 'list' && !showAllPersons && data.length >= 20 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page <= 1}
                        className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Précédent
                      </button>
                      <span className="text-sm text-gray-600">
                        Page {page} sur {totalPages}
                      </span>
                      <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page >= totalPages}
                        className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Suivant
                      </button>
                    </div>
                    <button
                      onClick={() => setShowAllPersons(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <span>Afficher tout</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {viewMode === 'list' && showAllPersons && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="text-center">
                    <button
                      onClick={() => {
                        setShowAllPersons(false);
                        setPage(1);
                      }}
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