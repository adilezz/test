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
  Globe
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
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [universities, setUniversities] = useState<UniversityResponse[]>([]);
  const [faculties, setFaculties] = useState<FacultyResponse[]>([]);
  const [schools, setSchools] = useState<SchoolResponse[]>([]);
  const [institutionsTree, setInstitutionsTree] = useState<any[]>([]);
  const [geoCountryModalOpen, setGeoCountryModalOpen] = useState(false);
  const [geoCountryNodes, setGeoCountryNodes] = useState<UITreeNode[]>([]);
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
    // Institution tree (for richer selection when needed)
    apiService.getAdminReferencesTree({ ref_type: 'schools', start_level: 'university', include_counts: false, max_depth: 3 })
      .then(setInstitutionsTree)
      .catch(() => {});
  }, []);

  const openCountryGeoModal = async () => {
    try {
      setGeoCountryModalOpen(true);
      const tree = await apiService.getAdminReferencesTree({
        ref_type: 'geographic',
        start_level: 'country',
        stop_level: 'country',
        include_counts: false
      });
      const nodes = (Array.isArray(tree) ? tree : []).map((n: any): UITreeNode => ({
        id: n.id,
        label: n.name_fr,
        type: 'location',
        level: 0,
        count: n.thesis_count || 0,
        children: []
      }));
      setGeoCountryNodes(nodes);
    } catch (e) {
      console.error('Failed to load countries', e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await apiService.adminList<PaginatedResponse>('academic_persons', { limit: 1000 });
      setData(response.data);
    } catch (error) {
      console.error('Error loading academic persons:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUniversities = async () => {
    try {
      const response = await apiService.adminList<PaginatedResponse>('universities', { load_all: 'true' });
      setUniversities(response.data);
    } catch (error) {
      console.error('Error loading universities:', error);
    }
  };

  const loadFaculties = async () => {
    try {
      const response = await apiService.adminList<PaginatedResponse>('faculties', { load_all: 'true' });
      setFaculties(response.data);
    } catch (error) {
      console.error('Error loading faculties:', error);
    }
  };

  const loadSchools = async () => {
    try {
      const response = await apiService.adminList<PaginatedResponse>('schools', { limit: 1000 });
      setSchools(response.data);
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
    } catch (error) {
      console.error('Error creating academic person:', error);
    }
  };

  const handleUpdate = async () => {
    if (!modal.item) return;
    
    try {
      await apiService.adminUpdate('academic_persons', modal.item.id, formData);
      setModal({ isOpen: false, mode: 'edit' });
      loadData();
    } catch (error) {
      console.error('Error updating academic person:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiService.adminDelete('academic_persons', id);
      loadData();
    } catch (error) {
      console.error('Error deleting academic person:', error);
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

  const filteredData = data.filter(person => 
    person.first_name_fr.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.last_name_fr.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (person.first_name_ar && person.first_name_ar.includes(searchTerm)) ||
    (person.last_name_ar && person.last_name_ar.includes(searchTerm)) ||
    (person.complete_name_fr && person.complete_name_fr.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (person.complete_name_ar && person.complete_name_ar.includes(searchTerm)) ||
    (person.title && person.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (person.external_institution_name && person.external_institution_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const renderModal = () => {
    if (!modal.isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
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

          {(modal.mode === 'create' || modal.mode === 'edit') && (
            <form onSubmit={(e) => {
              e.preventDefault();
              modal.mode === 'create' ? handleCreate() : handleUpdate();
            }} className="space-y-6">
              
              {/* Complete Names Section */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Noms complets</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom complet (Français)
                    </label>
                    <input
                      type="text"
                      value={formData.complete_name_fr || ''}
                      onChange={(e) => setFormData({ ...formData, complete_name_fr: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Dr. Jean Dupont"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الاسم الكامل (العربية)
                    </label>
                    <input
                      type="text"
                      value={formData.complete_name_ar || ''}
                      onChange={(e) => setFormData({ ...formData, complete_name_ar: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="د. محمد أحمد"
                      dir="rtl"
                    />
                  </div>
                </div>
              </div>

              {/* Individual Names Section */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Noms individuels</h3>
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
                      placeholder="Jean"
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
                      placeholder="Dupont"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الاسم الأول (العربية)
                    </label>
                    <input
                      type="text"
                      value={formData.first_name_ar || ''}
                      onChange={(e) => setFormData({ ...formData, first_name_ar: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="محمد"
                      dir="rtl"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      اللقب (العربية)
                    </label>
                    <input
                      type="text"
                      value={formData.last_name_ar || ''}
                      onChange={(e) => setFormData({ ...formData, last_name_ar: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="أحمد"
                      dir="rtl"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Informations additionnelles</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titre académique
                    </label>
                    <input
                      type="text"
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Dr., Prof., etc."
                      maxLength={10}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Utilisateur lié
                    </label>
                    <input
                      type="text"
                      value={formData.user_id || ''}
                      onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="ID de l'utilisateur (optionnel)"
                    />
                  </div>
                </div>
              </div>

              {/* External Institution */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Institution externe (si applicable)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom de l'institution externe
                    </label>
                    <input
                      type="text"
                      value={formData.external_institution_name || ''}
                      onChange={(e) => setFormData({ ...formData, external_institution_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nom de l'institution externe"
                      maxLength={255}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pays de l'institution externe
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={formData.external_institution_country || ''}
                        onChange={(e) => setFormData({ ...formData, external_institution_country: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Pays"
                        maxLength={100}
                      />
                      <button
                        type="button"
                        onClick={openCountryGeoModal}
                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Parcourir…
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type d'institution externe
                    </label>
                    <input
                      type="text"
                      value={formData.external_institution_type || ''}
                      onChange={(e) => setFormData({ ...formData, external_institution_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Université, Institut, etc."
                      maxLength={50}
                    />
                  </div>
                </div>
              </div>

              {/* Institutional Affiliation */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Affiliation institutionnelle</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      {universities.map(university => (
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
                      {faculties.map(faculty => (
                        <option key={faculty.id} value={faculty.id}>
                          {faculty.name_fr}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      École
                    </label>
                    <select
                      value={formData.school_id || ''}
                      onChange={(e) => setFormData({ ...formData, school_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sélectionner une école</option>
                      {schools.map(school => (
                        <option key={school.id} value={school.id}>
                          {school.name_fr}
                        </option>
                      ))}
                    </select>
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
            <div className="space-y-6">
              {/* Complete Names */}
              {(modal.item.complete_name_fr || modal.item.complete_name_ar) && (
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Noms complets</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {modal.item.complete_name_fr && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Nom complet (Français)</label>
                        <p className="mt-1 text-gray-900">{modal.item.complete_name_fr}</p>
                      </div>
                    )}
                    {modal.item.complete_name_ar && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">الاسم الكامل (العربية)</label>
                        <p className="mt-1 text-gray-900" dir="rtl">{modal.item.complete_name_ar}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Individual Names */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Noms individuels</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Prénom (Français)</label>
                    <p className="mt-1 text-gray-900">{modal.item.first_name_fr}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nom (Français)</label>
                    <p className="mt-1 text-gray-900">{modal.item.last_name_fr}</p>
                  </div>
                  {modal.item.first_name_ar && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">الاسم الأول (العربية)</label>
                      <p className="mt-1 text-gray-900" dir="rtl">{modal.item.first_name_ar}</p>
                    </div>
                  )}
                  {modal.item.last_name_ar && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">اللقب (العربية)</label>
                      <p className="mt-1 text-gray-900" dir="rtl">{modal.item.last_name_ar}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              {(modal.item.title || modal.item.user_id) && (
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Informations additionnelles</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {modal.item.title && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Titre académique</label>
                        <p className="mt-1 text-gray-900">{modal.item.title}</p>
                      </div>
                    )}
                    {modal.item.user_id && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Utilisateur lié</label>
                        <p className="mt-1 text-gray-900 font-mono text-xs">{modal.item.user_id}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* External Institution */}
              {(modal.item.external_institution_name || modal.item.external_institution_country || modal.item.external_institution_type) && (
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Institution externe</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {modal.item.external_institution_name && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Nom de l'institution</label>
                        <p className="mt-1 text-gray-900">{modal.item.external_institution_name}</p>
                      </div>
                    )}
                    {modal.item.external_institution_country && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Pays</label>
                        <p className="mt-1 text-gray-900">{modal.item.external_institution_country}</p>
                      </div>
                    )}
                    {modal.item.external_institution_type && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Type</label>
                        <p className="mt-1 text-gray-900">{modal.item.external_institution_type}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Institutional Affiliation */}
              {(modal.item.university_id || modal.item.faculty_id || modal.item.school_id) && (
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Affiliation institutionnelle</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {modal.item.university_id && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Université</label>
                        <p className="mt-1 text-gray-900">
                          {universities.find(u => u.id === modal.item?.university_id)?.name_fr || modal.item.university_id}
                        </p>
                      </div>
                    )}
                    {modal.item.faculty_id && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Faculté</label>
                        <p className="mt-1 text-gray-900">
                          {faculties.find(f => f.id === modal.item?.faculty_id)?.name_fr || modal.item.faculty_id}
                        </p>
                      </div>
                    )}
                    {modal.item.school_id && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">École</label>
                        <p className="mt-1 text-gray-900">
                          {schools.find(s => s.id === modal.item?.school_id)?.name_fr || modal.item.school_id}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Créée le</label>
                <p className="mt-1 text-gray-900">
                  {new Date(modal.item.created_at).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
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
              <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Filter className="w-4 h-4" />
                <span>Filtres</span>
              </button>
            </div>

            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span>Liste</span>
                </button>
                <button
                  onClick={() => setViewMode('card')}
                  className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'card'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                  <span>Cartes</span>
                </button>
              </div>

              <div className="text-sm text-gray-600">
                {filteredData.length} personne{filteredData.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'list' ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
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
                      Utilisateur lié
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
                  {filteredData.map((person) => (
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
                            <div className="flex items-center space-x-1 text-blue-600 font-medium">
                              <span>{person.title}</span>
                            </div>
                          )}
                          {person.external_institution_name && (
                            <div className="flex items-center space-x-1 text-gray-600 mt-1">
                              <Building2 className="w-3 h-3" />
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {person.user_id ? (
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                              {person.user_id.substring(0, 8)}...
                            </span>
                          ) : (
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

              {filteredData.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">
                    {searchTerm ? 'Aucune personne trouvée pour cette recherche' : 'Aucune personne trouvée'}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredData.map((person) => (
              <div key={person.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-200">
                <div className="p-6">
                  {/* Header with Avatar */}
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium">
                        {person.first_name_fr.charAt(0)}{person.last_name_fr.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {person.complete_name_fr || `${person.first_name_fr} ${person.last_name_fr}`}
                      </h3>
                      {person.complete_name_ar && (
                        <p className="text-sm text-gray-500 truncate" dir="rtl">
                          {person.complete_name_ar}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div className="space-y-2 mb-4">
                    {person.title && (
                      <div className="flex items-center space-x-2 text-sm text-blue-600 font-medium">
                        <GraduationCap className="w-4 h-4" />
                        <span>{person.title}</span>
                      </div>
                    )}
                    {person.external_institution_name && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Building2 className="w-4 h-4" />
                        <span className="truncate">{person.external_institution_name}</span>
                      </div>
                    )}
                    {person.user_id && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        <span className="font-mono text-xs">{person.user_id.substring(0, 8)}...</span>
                      </div>
                    )}
                  </div>

                  {/* Institutional Affiliation */}
                  {(person.university_id || person.faculty_id || person.school_id) && (
                    <div className="border-t border-gray-200 pt-4 mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Affiliation</h4>
                      <div className="space-y-1">
                        {person.university_id && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Building2 className="w-3 h-3" />
                            <span className="truncate">
                              {universities.find(u => u.id === person.university_id)?.name_fr || 'Université'}
                            </span>
                          </div>
                        )}
                        {person.faculty_id && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <GraduationCap className="w-3 h-3" />
                            <span className="truncate">
                              {faculties.find(f => f.id === person.faculty_id)?.name_fr || 'Faculté'}
                            </span>
                          </div>
                        )}
                        {person.school_id && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <School className="w-3 h-3" />
                            <span className="truncate">
                              {schools.find(s => s.id === person.school_id)?.name_fr || 'École'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <span className="text-xs text-gray-500">
                      {new Date(person.created_at).toLocaleDateString('fr-FR')}
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openModal('view', person)}
                        className="text-gray-400 hover:text-gray-600 p-1"
                        title="Voir les détails"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openModal('edit', person)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Êtes-vous sûr de vouloir supprimer cette personne ?')) {
                            handleDelete(person.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredData.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">
                  {searchTerm ? 'Aucune personne trouvée pour cette recherche' : 'Aucune personne trouvée'}
                </p>
              </div>
            )}
          </div>
        )}

        {renderModal()}

        {/* Country Picker Modal for External Institution */}
        {geoCountryModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Sélectionner un pays</h3>
                <button
                  onClick={() => setGeoCountryModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <TreeView
                nodes={geoCountryNodes}
                onNodeSelect={(node) => {
                  setFormData(prev => ({ ...prev, external_institution_country: node.label }));
                  setGeoCountryModalOpen(false);
                }}
                multiSelect={false}
                searchable={true}
                maxHeight="360px"
                showCounts={false}
                showIcons={true}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}