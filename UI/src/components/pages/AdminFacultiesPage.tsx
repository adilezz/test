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
import { mapApiTreeToUiNodes, universitiesHierarchyResolver, schoolsHierarchyResolver } from '../../utils/treeMappers';
import AdminHeader from '../layout/AdminHeader';
import { 
  UniversityResponse, 
  FacultyResponse, 
  DepartmentResponse,
  PaginatedResponse,
  FacultyCreate,
  FacultyUpdate
} from '../../types/api';

//

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'delete' | 'view';
  item?: FacultyResponse;
}

export default function AdminFacultiesPage() {
  const [searchParams] = useSearchParams();
  const [faculties, setFaculties] = useState<FacultyResponse[]>([]);
  const [treeData, setTreeData] = useState<UITreeNode[]>([]);
  const [universities, setUniversities] = useState<UniversityResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllFaculties, setShowAllFaculties] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [modal, setModal] = useState<ModalState>({ isOpen: false, mode: 'create' });
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    university_id: '',
    has_departments: '',
    has_theses: ''
  });
  const [formData, setFormData] = useState<FacultyCreate>({
    university_id: '',
    name_fr: '',
    name_en: '',
    name_ar: '',
    acronym: ''
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState({
    total: 0,
    withDepartments: 0,
    withTheses: 0,
    byUniversity: {} as Record<string, number>
  });

  useEffect(() => {
    loadData();
    loadUniversities();
    
    // Check if university_id is provided in URL params
    const universityId = searchParams.get('university_id');
    if (universityId) {
      setFilters(prev => ({ ...prev, university_id: universityId }));
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, filters, page, viewMode]);


  // Show all faculties effect
  useEffect(() => {
    if (viewMode === 'list') {
      loadData();
    }
  }, [showAllFaculties]);

  const loadUniversities = async () => {
    try {
      const response = await apiService.adminList<PaginatedResponse>('universities', { load_all: 'true' });
      setUniversities(response.data || []);
    } catch (error) {
      console.error('Error loading universities:', error);
    }
  };

  //

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (viewMode === 'tree') {
        // Load tree data starting from universities to departments (fixed hierarchy)
        const treeResponse = await apiService.getAdminReferencesTree({
          ref_type: 'universities',
          start_level: 'university',
          stop_level: 'department',
          include_counts: true
        });
        setTreeData(mapApiTreeToUiNodes(treeResponse as any, universitiesHierarchyResolver));
      } else {
        // Load list data
        const params: Record<string, string | number> = {
          page,
          limit: showAllFaculties ? 1000 : 20
        };
        
        if (searchTerm.trim()) {
          params.search = searchTerm.trim();
        }
        if (filters.university_id) {
          params.university_id = filters.university_id;
        }
        if (filters.has_departments) {
          params.has_departments = filters.has_departments;
        }
        if (filters.has_theses) {
          params.has_theses = filters.has_theses;
        }

        const response = await apiService.adminList<PaginatedResponse>('faculties', params);
        setFaculties(response.data || []);
        
        if (response.meta) {
          setTotalPages(response.meta.pages);
          setStatistics(prev => ({
            ...prev,
            total: response.meta.total
          }));
        }
      }
    } catch (error: any) {
      console.error('Error loading faculties:', error);
      setError(error.message || 'Erreur lors du chargement des facultés');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setError(null);
      // Clean form data before sending
      const cleanData = {
        ...formData,
        name_en: formData.name_en || undefined,
        name_ar: formData.name_ar || undefined,
        acronym: formData.acronym || undefined
      };
      
      await apiService.adminCreate('faculties', cleanData);
      setModal({ isOpen: false, mode: 'create' });
      setFormData({
        university_id: '',
        name_fr: '',
        name_en: '',
        name_ar: '',
        acronym: ''
      });
      loadData();
    } catch (error: any) {
      console.error('Error creating faculty:', error);
      setError(error.message || 'Erreur lors de la création de la faculté');
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
        acronym: formData.acronym || undefined
      };
      
      await apiService.adminUpdate('faculties', modal.item.id, cleanData);
      setModal({ isOpen: false, mode: 'edit' });
      loadData();
    } catch (error: any) {
      console.error('Error updating faculty:', error);
      setError(error.message || 'Erreur lors de la mise à jour de la faculté');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setError(null);
      await apiService.adminDelete('faculties', id);
      loadData();
    } catch (error: any) {
      console.error('Error deleting faculty:', error);
      setError(error.message || 'Erreur lors de la suppression de la faculté');
    }
  };

  const openModal = (mode: ModalState['mode'], item?: FacultyResponse) => {
    setError(null);
    setModal({ isOpen: true, mode, item });
    if (mode === 'edit' && item) {
      setFormData({
        university_id: item.university_id,
        name_fr: item.name_fr,
        name_en: item.name_en || '',
        name_ar: item.name_ar || '',
        acronym: item.acronym || ''
      });
    } else if (mode === 'create') {
      // Pre-select university if filtering by one
      const preSelectedUniversity = filters.university_id || searchParams.get('university_id') || '';
      setFormData({
        university_id: preSelectedUniversity,
        name_fr: '',
        name_en: '',
        name_ar: '',
        acronym: ''
      });
    }
  };

  //

  const getUniversityName = (universityId: string) => {
    const university = universities.find(u => u.id === universityId);
    return university?.name_fr || 'Université inconnue';
  };

  //

  //

  const renderModal = () => {
    if (!modal.isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {modal.mode === 'create' && 'Nouvelle Faculté'}
              {modal.mode === 'edit' && 'Modifier Faculté'}
              {modal.mode === 'view' && 'Détails Faculté'}
              {modal.mode === 'delete' && 'Supprimer Faculté'}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Université *
                </label>
                <select
                  value={formData.university_id}
                  onChange={(e) => setFormData({ ...formData, university_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Sélectionner une université</option>
                  {universities.map((university) => (
                    <option key={university.id} value={university.id}>
                      {university.name_fr} {university.acronym && `(${university.acronym})`}
                    </option>
                  ))}
                </select>
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
                <label className="block text-sm font-medium text-gray-700">Université</label>
                <p className="mt-1 text-gray-900">{getUniversityName(modal.item.university_id)}</p>
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

  if (loading && faculties.length === 0) {
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
              <h1 className="text-3xl font-bold text-gray-900">Facultés</h1>
              <p className="text-gray-600 mt-2">
                Gérer les facultés et leurs départements
              </p>
            </div>
            <button
              onClick={() => openModal('create')}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Faculté</span>
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Facultés</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {statistics.total.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <Users className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avec Départements</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {statistics.withDepartments.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <Building2 className="w-6 h-6" />
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
                to="/admin/universities"
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Building2 className="w-4 h-4" />
                <span>Gérer Universités</span>
              </Link>
              <Link
                to="/admin/departments"
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Users className="w-4 h-4" />
                <span>Gérer Départements</span>
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
                      {university.name_fr} {university.acronym && `(${university.acronym})`}
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
                onClick={() => setFilters({ university_id: '', has_departments: '', has_theses: '' })}
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
                Structure Hiérarchique des Facultés
              </h2>
              {treeData.length > 0 ? (
                <TreeView 
                  nodes={treeData} 
                  searchable 
                  showCounts 
                  showIcons 
                  maxHeight="500px" 
                  showContextMenu={true}
                  onNodeView={(node) => {
                    const faculty = faculties.find(f => f.name_fr === node.label);
                    if (faculty) {
                      openModal('view', faculty);
                    }
                  }}
                  onNodeAdd={(node) => {
                    // For faculties, add a new department
                    if (node.type === 'faculty') {
                      console.log('Add department to faculty:', node.label);
                    }
                  }}
                  onNodeEdit={(node) => {
                    const faculty = faculties.find(f => f.name_fr === node.label);
                    if (faculty) {
                      openModal('edit', faculty);
                    }
                  }}
                  onNodeDelete={(node) => {
                    const faculty = faculties.find(f => f.name_fr === node.label);
                    if (faculty && confirm(`Êtes-vous sûr de vouloir supprimer "${node.label}" ?`)) {
                      handleDelete(faculty.id);
                    }
                  }}
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <GraduationCap className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Aucune faculté trouvée</p>
                  <p className="text-sm">Aucune donnée disponible pour les critères sélectionnés</p>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Faculté
                  </th>
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
                {faculties.map((faculty) => (
                  <tr key={faculty.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {faculty.name_fr}
                        </div>
                        {(faculty.name_en || faculty.name_ar) && (
                          <div className="text-sm text-gray-500">
                            {faculty.name_en && <span>{faculty.name_en}</span>}
                            {faculty.name_en && faculty.name_ar && <span> • </span>}
                            {faculty.name_ar && <span>{faculty.name_ar}</span>}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getUniversityName(faculty.university_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {faculty.acronym || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(faculty.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openModal('view', faculty)}
                          className="text-gray-400 hover:text-gray-600"
                          title="Voir les détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal('edit', faculty)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <Link
                          to={`/admin/departments?faculty_id=${faculty.id}`}
                          className="text-green-600 hover:text-green-900"
                          title="Gérer les départements"
                        >
                          <Users className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => {
                            if (confirm('Êtes-vous sûr de vouloir supprimer cette faculté ?')) {
                              handleDelete(faculty.id);
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

              {/* Show All Button for List View */}
              {viewMode === 'list' && !showAllFaculties && faculties.length >= 20 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="text-center">
                    <button
                      onClick={() => setShowAllFaculties(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors mx-auto"
                    >
                      <span>Afficher toutes les facultés</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {viewMode === 'list' && showAllFaculties && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="text-center">
                    <button
                      onClick={() => setShowAllFaculties(false)}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors mx-auto"
                    >
                      <span>Afficher moins</span>
                      <ChevronRight className="w-4 h-4 rotate-90" />
                    </button>
                  </div>
                </div>
              )}
              
              {faculties.length === 0 && !loading && (
                <div className="px-6 py-12 text-center">
                  <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune faculté trouvée</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm || Object.values(filters).some(f => f) 
                      ? 'Aucune faculté ne correspond à vos critères de recherche.'
                      : 'Commencez par créer votre première faculté.'
                    }
                  </p>
                  {!searchTerm && !Object.values(filters).some(f => f) && (
                    <button
                      onClick={() => openModal('create')}
                      className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Nouvelle Faculté</span>
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