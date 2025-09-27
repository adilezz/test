import React, { useState, useEffect } from 'react';
import { 
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Users,
  Mail,
  Building2,
  GraduationCap,
  X,
  Check,
  AlertCircle,
  UserPlus,
  ExternalLink,
  Grid3X3,
  List,
  Phone,
  School,
  Globe,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
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

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'delete' | 'view';
  item?: AcademicPersonResponse;
}

export default function AdminAcademicPersonsPage() {
  const [data, setData] = useState<AcademicPersonResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('list');
  const [showAllPersons, setShowAllPersons] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    university_id: '',
    faculty_id: '',
    school_id: '',
    title: ''
  });
  const [universities, setUniversities] = useState<UniversityResponse[]>([]);
  const [faculties, setFaculties] = useState<FacultyResponse[]>([]);
  const [schools, setSchools] = useState<SchoolResponse[]>([]);
  const [modal, setModal] = useState<ModalState>({ isOpen: false, mode: 'create' });
  const [formData, setFormData] = useState<AcademicPersonCreate>({
    complete_name_fr: '',
    complete_name_ar: '',
    first_name_fr: '',
    last_name_fr: '',
    first_name_ar: '',
    last_name_ar: '',
    title: '',
    university_id: '',
    faculty_id: '',
    school_id: '',
    external_institution_name: '',
    external_institution_country: '',
    external_institution_type: '',
    user_id: ''
  });

  useEffect(() => {
    loadData();
    loadUniversities();
    loadFaculties();
    loadSchools();
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, filters]);

  // Show all persons effect
  useEffect(() => {
    loadData();
  }, [showAllPersons]);

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
      
      // Apply limit if not showing all
      if (!showAllPersons) {
        params.limit = 20;
      } else {
        params.limit = 1000;
      }
      
      console.log('Loading academic persons with params:', params);
      const response = await apiService.adminList<PaginatedResponse>('academic_persons', params);
      console.log('Academic persons response:', response);
      setData(response.data || []);
    } catch (error) {
      console.error('Error loading academic persons:', error);
      // Show error details for debugging
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        setError(`Erreur de connexion à l'API: ${error.message}`);
      } else {
        setError('Erreur inconnue lors du chargement des données');
      }
      // If the endpoint doesn't exist, show empty data
      setData([]);
    } finally {
      setLoading(false);
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
      const response = await apiService.adminList<PaginatedResponse>('schools', { limit: 1000 });
      setSchools(response.data || []);
    } catch (error) {
      console.error('Error loading schools:', error);
    }
  };

  const handleCreate = async () => {
    try {
      await apiService.adminCreate('academic_persons', formData);
      setModal({ isOpen: false, mode: 'create' });
      resetForm();
      loadData();
      // Show success message
      setError(null);
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
    
    try {
      await apiService.adminUpdate('academic_persons', modal.item.id, formData);
      setModal({ isOpen: false, mode: 'edit' });
      loadData();
      setError(null);
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
      setError(null);
    } catch (error) {
      console.error('Error deleting academic person:', error);
      if (error instanceof Error) {
        setError(`Erreur lors de la suppression: ${error.message}`);
      } else {
        setError('Erreur inconnue lors de la suppression');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      complete_name_fr: '',
      complete_name_ar: '',
      first_name_fr: '',
      last_name_fr: '',
      first_name_ar: '',
      last_name_ar: '',
      title: '',
      university_id: '',
      faculty_id: '',
      school_id: '',
      external_institution_name: '',
      external_institution_country: '',
      external_institution_type: '',
      user_id: ''
    });
  };

  const openModal = (mode: ModalState['mode'], item?: AcademicPersonResponse) => {
    setModal({ isOpen: true, mode, item });
    
    if (mode === 'edit' && item) {
      setFormData({
        complete_name_fr: item.complete_name_fr || '',
        complete_name_ar: item.complete_name_ar || '',
        first_name_fr: item.first_name_fr,
        last_name_fr: item.last_name_fr,
        first_name_ar: item.first_name_ar || '',
        last_name_ar: item.last_name_ar || '',
        title: item.title || '',
        university_id: item.university_id || '',
        faculty_id: item.faculty_id || '',
        school_id: item.school_id || '',
        external_institution_name: item.external_institution_name || '',
        external_institution_country: item.external_institution_country || '',
        external_institution_type: item.external_institution_type || '',
        user_id: item.user_id || ''
      });
    } else if (mode === 'create') {
      resetForm();
    }
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
            }} className="space-y-6">
              
              {/* Names Section - French */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Informations Personnelles (Français)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prénom (Français) *
                    </label>
                    <input
                      type="text"
                      value={formData.first_name_fr}
                      onChange={(e) => setFormData({ ...formData, first_name_fr: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom (Français) *
                    </label>
                    <input
                      type="text"
                      value={formData.last_name_fr}
                      onChange={(e) => setFormData({ ...formData, last_name_fr: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
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
                    onChange={(e) => setFormData({ ...formData, complete_name_fr: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, first_name_ar: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, last_name_ar: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, complete_name_ar: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, university_id: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, faculty_id: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, school_id: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, external_institution_name: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, external_institution_country: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, external_institution_type: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
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
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nom complet</label>
                <p className="mt-1 text-gray-900">
                  {modal.item.complete_name_fr || `${modal.item.first_name_fr} ${modal.item.last_name_fr}`}
                </p>
              </div>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <Users className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Personnes</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {data.length.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avec Institution externe</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {data.filter(p => p.external_institution_name).length.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <Users className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avec Utilisateur lié</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {data.filter(p => p.user_id).length.toLocaleString()}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setFilters({ university_id: '', faculty_id: '', school_id: '', title: '' })}
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
                <h3 className="text-sm font-medium text-red-800">Erreur de chargement</h3>
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
              <div className="space-y-1">
                {data.length > 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Vue arbre en cours de développement</p>
                    <p className="text-sm">Utilisez la vue liste pour le moment</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Aucune personne académique trouvée</p>
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
                      Personne
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Titre / Institution externe
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Affiliation
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
                  {data.map((person) => (
                    <tr key={person.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {person.first_name_fr.charAt(0)}{person.last_name_fr.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {person.complete_name_fr || `${person.first_name_fr} ${person.last_name_fr}`}
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
                            <div className="text-gray-600 mt-1 truncate">
                              {person.external_institution_name}
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
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openModal('edit', person)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Êtes-vous sûr de vouloir supprimer cette personne ?')) {
                                handleDelete(person.id);
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

              {data.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">
                    {searchTerm ? 'Aucune personne trouvée pour cette recherche' : 'Aucune personne trouvée'}
                  </p>
                </div>
              )}

              {/* Show All Button for List View */}
              {viewMode === 'list' && !showAllPersons && data.length >= 20 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="text-center">
                    <button
                      onClick={() => setShowAllPersons(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors mx-auto"
                    >
                      <span>Afficher toutes les personnes</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {viewMode === 'list' && showAllPersons && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="text-center">
                    <button
                      onClick={() => setShowAllPersons(false)}
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