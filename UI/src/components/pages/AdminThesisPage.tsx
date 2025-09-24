import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Check, 
  AlertCircle, 
  X,
  ChevronRight,
  Plus,
  Minus,
  Eye,
  EyeOff,
  Save,
  ArrowLeft,
  RefreshCw,
  Download,
  Trash2,
  CheckSquare,
  Square,
  Search,
  User,
  Building2,
  Calendar,
  Tag,
  Globe,
  BookOpen,
  Edit,
  UserPlus
} from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import AdminHeader from '../layout/AdminHeader';
import TreeView from '../ui/TreeView/TreeView';
import { TreeNode as UITreeNode } from '../../types/tree';
import { 
  ThesisCreate,
  ThesisUpdate, 
  FileUploadResponse,
  UniversityResponse,
  FacultyResponse,
  DegreeResponse,
  LanguageResponse,
  CategoryResponse,
  KeywordResponse,
  AcademicPersonResponse,
  PaginatedResponse,
  ThesisStatus,
  AcademicRole,
  ThesisResponse
} from '../../types/api';

interface AcademicPersonAssignment {
  id: string;
  person_id: string;
  role: AcademicRole;
  person_name?: string;
  is_external: boolean;
  external_institution_name?: string;
}

interface ThesisItem {
  id: string;
  filename: string;
  status: 'loading' | 'extracting' | 'ready' | 'error';
  progress: number;
  extractedData?: Partial<ThesisCreate>;
  file_id?: string;
}

export default function AdminThesisPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  // State
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showPdfViewer, setShowPdfViewer] = useState(true);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [fileUploadResponse, setFileUploadResponse] = useState<FileUploadResponse | null>(null);
  
  // Reference data
  const [universities, setUniversities] = useState<UniversityResponse[]>([]);
  const [faculties, setFaculties] = useState<FacultyResponse[]>([]);
  const [degrees, setDegrees] = useState<DegreeResponse[]>([]);
  const [languages, setLanguages] = useState<LanguageResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [keywords, setKeywords] = useState<KeywordResponse[]>([]);
  const [academicPersons, setAcademicPersons] = useState<AcademicPersonResponse[]>([]);
  const [geographicEntities, setGeographicEntities] = useState<any[]>([]);
  const [geoModalOpen, setGeoModalOpen] = useState(false);
  const [geoNodes, setGeoNodes] = useState<UITreeNode[]>([]);
  const [selectedGeoLabel, setSelectedGeoLabel] = useState<string>('');

  // Form data
  const [formData, setFormData] = useState<ThesisCreate>({
    title_fr: '',
    title_en: '',
    title_ar: '',
    abstract_fr: '',
    abstract_en: '',
    abstract_ar: '',
    university_id: '',
    faculty_id: '',
    school_id: '',
    department_id: '',
    degree_id: '',
    thesis_number: '',
    study_location_id: '',
    defense_date: '',
    language_id: '',
    secondary_language_ids: [],
    page_count: 0,
    status: ThesisStatus.DRAFT,
    file_id: ''
  });

  const [academicPersonAssignments, setAcademicPersonAssignments] = useState<AcademicPersonAssignment[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);

  // Modals
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [showKeywordModal, setShowKeywordModal] = useState(false);
  const [newPersonData, setNewPersonData] = useState({ first_name: '', last_name: '', email: '', title: '' });
  const [newKeywordData, setNewKeywordData] = useState({ word_fr: '', word_en: '', word_ar: '' });

  useEffect(() => {
    loadReferenceData();
    if (isEditMode) {
      loadThesis();
    }
  }, [id]);

  useEffect(() => {
    if (geographicEntities && formData.study_location_id) {
      const sel = geographicEntities.find((e) => e.id === formData.study_location_id);
      setSelectedGeoLabel(sel ? sel.name_fr : '');
    }
  }, [geographicEntities, formData.study_location_id]);

  const loadReferenceData = async () => {
    try {
      const [
        universitiesRes,
        degreesRes,
        languagesRes,
        categoriesRes,
        keywordsRes,
        academicPersonsRes,
        geoRes
      ] = await Promise.all([
        apiService.adminList<PaginatedResponse>('universities', { load_all: 'true' }),
        apiService.adminList<PaginatedResponse>('degrees', { load_all: 'true' }),
        apiService.adminList<PaginatedResponse>('languages', { load_all: 'true' }),
        apiService.adminList<PaginatedResponse>('categories', { load_all: 'true' }),
        apiService.adminList<PaginatedResponse>('keywords', { load_all: 'true' }),
        apiService.adminList<PaginatedResponse>('academic_persons', { load_all: 'true' }),
        apiService.adminList<PaginatedResponse>('geographic_entities', { load_all: 'true' })
      ]);

      setUniversities(universitiesRes.data);
      setDegrees(degreesRes.data);
      setLanguages(languagesRes.data);
      setCategories(categoriesRes.data);
      setKeywords(keywordsRes.data);
      setAcademicPersons(academicPersonsRes.data);
      setGeographicEntities(geoRes.data);
    } catch (error) {
      console.error('Error loading reference data:', error);
    }
  };

  const openGeoModal = async () => {
    try {
      setGeoModalOpen(true);
      const tree = await apiService.getAdminReferencesTree({
        ref_type: 'geographic',
        start_level: 'country',
        stop_level: 'city',
        include_counts: false
      });
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
      console.error('Failed to load geographic tree', e);
    }
  };

  const loadFaculties = async (universityId: string) => {
    try {
      const response = await apiService.adminGet<UniversityResponse>('universities', universityId);
      // Load faculties for this university - would need specific endpoint
      // For now, we'll use a placeholder
      setFaculties([]);
    } catch (error) {
      console.error('Error loading faculties:', error);
    }
  };

  const loadThesis = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const thesis = await apiService.getThesis(id);
      setFormData({
        title_fr: thesis.title_fr,
        title_en: thesis.title_en || '',
        title_ar: thesis.title_ar || '',
        abstract_fr: thesis.abstract_fr,
        abstract_en: thesis.abstract_en || '',
        abstract_ar: thesis.abstract_ar || '',
        university_id: thesis.university_id || '',
        faculty_id: thesis.faculty_id || '',
        school_id: thesis.school_id || '',
        department_id: thesis.department_id || '',
        degree_id: thesis.degree_id || '',
        thesis_number: thesis.thesis_number || '',
        study_location_id: thesis.study_location_id || '',
        defense_date: thesis.defense_date,
        language_id: thesis.language_id,
        secondary_language_ids: thesis.secondary_language_ids || [],
        page_count: thesis.page_count || 0,
        status: thesis.status,
        file_id: '' // File already uploaded
      });
      
      if (thesis.file_url) {
        setPdfUrl(thesis.file_url);
      }
    } catch (error) {
      console.error('Error loading thesis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setUploadProgress(0);
      const response = await apiService.uploadFile(file, (progress) => {
        setUploadProgress(progress);
      });
      
      setFileUploadResponse(response);
      setFormData(prev => ({ ...prev, file_id: response.file_id }));
      
      // Create object URL for preview
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      setUploadedFile(file);
      
      // Simulate metadata extraction
      setTimeout(() => {
        setFormData(prev => ({
          ...prev,
          title_fr: prev.title_fr || 'Titre extrait automatiquement',
          page_count: prev.page_count || 287
        }));
      }, 2000);
      
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUniversityChange = (universityId: string) => {
    setFormData(prev => ({
      ...prev,
      university_id: universityId,
      faculty_id: '',
      department_id: ''
    }));
    if (universityId) {
      loadFaculties(universityId);
    }
  };

  const addAcademicPerson = () => {
    const newAssignment: AcademicPersonAssignment = {
      id: Date.now().toString(),
      person_id: '',
      role: AcademicRole.AUTHOR,
      is_external: false
    };
    setAcademicPersonAssignments(prev => [...prev, newAssignment]);
  };

  const updateAcademicPerson = (id: string, field: keyof AcademicPersonAssignment, value: any) => {
    setAcademicPersonAssignments(prev => prev.map(assignment => 
      assignment.id === id ? { ...assignment, [field]: value } : assignment
    ));
  };

  const removeAcademicPerson = (id: string) => {
    setAcademicPersonAssignments(prev => prev.filter(assignment => assignment.id !== id));
  };

  const createNewPerson = async () => {
    try {
      const newPerson = await apiService.adminCreate<AcademicPersonResponse>('academic_persons', newPersonData);
      setAcademicPersons(prev => [...prev, newPerson]);
      setNewPersonData({ first_name: '', last_name: '', email: '', title: '' });
      setShowPersonModal(false);
    } catch (error) {
      console.error('Error creating person:', error);
    }
  };

  const createNewKeyword = async () => {
    try {
      const newKeyword = await apiService.adminCreate<KeywordResponse>('keywords', newKeywordData);
      setKeywords(prev => [...prev, newKeyword]);
      setSelectedKeywords(prev => [...prev, newKeyword.id]);
      setNewKeywordData({ word_fr: '', word_en: '', word_ar: '' });
      setShowKeywordModal(false);
    } catch (error) {
      console.error('Error creating keyword:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.file_id && !isEditMode) {
      alert('Veuillez télécharger un fichier PDF');
      return;
    }

    setSaving(true);
    try {
      if (isEditMode) {
        await apiService.updateThesis(id!, formData as ThesisUpdate);
      } else {
        await apiService.createThesis(formData);
      }
      
      navigate('/admin/theses');
    } catch (error) {
      console.error('Error saving thesis:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
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
          <Link
            to="/admin/theses"
            className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à la liste</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditMode ? 'Modifier la thèse' : 'Nouvelle thèse'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isEditMode ? 'Modifier les métadonnées de la thèse' : 'Ajouter une nouvelle thèse au système'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* PDF Viewer Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Document PDF</h2>
                <button
                  type="button"
                  onClick={() => setShowPdfViewer(!showPdfViewer)}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                >
                  {showPdfViewer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{showPdfViewer ? 'Masquer' : 'Afficher'}</span>
                </button>
              </div>

              {!uploadedFile && !pdfUrl ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Télécharger le PDF de la thèse
                  </h3>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label
                    htmlFor="pdf-upload"
                    className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer"
                  >
                    <span>Choisir un fichier</span>
                  </label>
                </div>
              ) : (
                <div>
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Téléchargement...</span>
                        <span className="text-sm text-gray-600">{Math.round(uploadProgress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-3 mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <Check className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">Fichier chargé</p>
                      <p className="text-sm text-green-600">
                        {uploadedFile?.name || 'Fichier existant'}
                      </p>
                    </div>
                  </div>

                  {showPdfViewer && pdfUrl && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <iframe
                        src={pdfUrl}
                        className="w-full h-96"
                        title="PDF Viewer"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Form Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Métadonnées de la thèse</h2>
              
              <div className="space-y-6">
                {/* Titles */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titre (Français) *
                    </label>
                    <textarea
                      name="title_fr"
                      value={formData.title_fr}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Titre complet de la thèse en français"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titre (Anglais)
                    </label>
                    <textarea
                      name="title_en"
                      value={formData.title_en}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Titre en anglais (optionnel)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titre (Arabe)
                    </label>
                    <textarea
                      name="title_ar"
                      value={formData.title_ar}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="العنوان باللغة العربية (اختياري)"
                      dir="rtl"
                    />
                  </div>
                </div>

                {/* Institution Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Université *
                    </label>
                    <select
                      name="university_id"
                      value={formData.university_id}
                      onChange={(e) => handleUniversityChange(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Sélectionnez une université</option>
                      {universities.map(university => (
                        <option key={university.id} value={university.id}>
                          {university.name_fr} {university.acronym && `(${university.acronym})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Diplôme *
                    </label>
                    <select
                      name="degree_id"
                      value={formData.degree_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Sélectionnez un diplôme</option>
                      {degrees.map(degree => (
                        <option key={degree.id} value={degree.id}>
                          {degree.name_fr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date de soutenance *
                    </label>
                    <input
                      type="date"
                      name="defense_date"
                      value={formData.defense_date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Langue principale *
                    </label>
                    <select
                      name="language_id"
                      value={formData.language_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Sélectionnez une langue</option>
                      {languages.map(language => (
                        <option key={language.id} value={language.id}>
                          {language.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de pages
                    </label>
                    <input
                      type="number"
                      name="page_count"
                      value={formData.page_count || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                    />
                  </div>
                </div>

                {/* Study Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lieu d'étude
                  </label>
                  <div className="flex items-center space-x-2">
                    <select
                      name="study_location_id"
                      value={formData.study_location_id || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, study_location_id: e.target.value }))}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sélectionnez une localisation</option>
                      {geographicEntities.map((entity) => (
                        <option key={entity.id} value={entity.id}>
                          {entity.name_fr} {entity.level && `(${entity.level})`}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={openGeoModal}
                      className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Parcourir…
                    </button>
                  </div>
                  {selectedGeoLabel && (
                    <p className="mt-1 text-xs text-gray-500">Sélectionné: {selectedGeoLabel}</p>
                  )}
                </div>

                {/* Academic Persons */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Personnes académiques
                    </label>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowPersonModal(true)}
                        className="flex items-center space-x-1 text-green-600 hover:text-green-800 text-sm"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Nouvelle personne</span>
                      </button>
                      <button
                        type="button"
                        onClick={addAcademicPerson}
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Ajouter</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {academicPersonAssignments.map((assignment, index) => (
                      <div key={assignment.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-700">
                            Personne {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeAcademicPerson(assignment.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <select
                              value={assignment.person_id}
                              onChange={(e) => updateAcademicPerson(assignment.id, 'person_id', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            >
                              <option value="">Sélectionnez une personne</option>
                              {academicPersons.map(person => (
                                <option key={person.id} value={person.id}>
                                  {person.first_name} {person.last_name}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <select
                              value={assignment.role}
                              onChange={(e) => updateAcademicPerson(assignment.id, 'role', e.target.value as AcademicRole)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            >
                              <option value={AcademicRole.AUTHOR}>Auteur</option>
                              <option value={AcademicRole.DIRECTOR}>Directeur</option>
                              <option value={AcademicRole.CO_DIRECTOR}>Co-directeur</option>
                              <option value={AcademicRole.JURY_PRESIDENT}>Président du jury</option>
                              <option value={AcademicRole.JURY_MEMBER}>Membre du jury</option>
                              <option value={AcademicRole.RAPPORTEUR}>Rapporteur</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Keywords */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Mots-clés
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowKeywordModal(true)}
                      className="flex items-center space-x-1 text-green-600 hover:text-green-800 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Nouveau mot-clé</span>
                    </button>
                  </div>
                  
                  <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto">
                    <div className="space-y-2">
                      {keywords.map(keyword => (
                        <label key={keyword.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedKeywords.includes(keyword.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedKeywords(prev => [...prev, keyword.id]);
                              } else {
                                setSelectedKeywords(prev => prev.filter(id => id !== keyword.id));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-900">{keyword.word_fr}</span>
                          {keyword.word_en && (
                            <span className="text-sm text-gray-500">({keyword.word_en})</span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Abstracts */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Résumé (Français) *
                    </label>
                    <textarea
                      name="abstract_fr"
                      value={formData.abstract_fr}
                      onChange={handleInputChange}
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Résumé de la thèse en français"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Résumé (Anglais)
                    </label>
                    <textarea
                      name="abstract_en"
                      value={formData.abstract_en}
                      onChange={handleInputChange}
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Abstract in English (optional)"
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Statut *
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value={ThesisStatus.DRAFT}>Brouillon</option>
                    <option value={ThesisStatus.SUBMITTED}>Soumise</option>
                    <option value={ThesisStatus.UNDER_REVIEW}>En révision</option>
                    <option value={ThesisStatus.APPROVED}>Approuvée</option>
                    <option value={ThesisStatus.PUBLISHED}>Publiée</option>
                    <option value={ThesisStatus.REJECTED}>Rejetée</option>
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => navigate('/admin/theses')}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors duration-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* New Person Modal */}
        {showPersonModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Nouvelle Personne Académique</h3>
                <button
                  onClick={() => setShowPersonModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prénom *</label>
                  <input
                    type="text"
                    value={newPersonData.first_name}
                    onChange={(e) => setNewPersonData(prev => ({ ...prev, first_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom *</label>
                  <input
                    type="text"
                    value={newPersonData.last_name}
                    onChange={(e) => setNewPersonData(prev => ({ ...prev, last_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={newPersonData.email}
                    onChange={(e) => setNewPersonData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Titre</label>
                  <input
                    type="text"
                    value={newPersonData.title}
                    onChange={(e) => setNewPersonData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Dr., Prof., etc."
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowPersonModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Annuler
                </button>
                <button
                  onClick={createNewPerson}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Créer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* New Keyword Modal */}
        {showKeywordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Nouveau Mot-clé</h3>
                <button
                  onClick={() => setShowKeywordModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mot-clé (Français) *</label>
                  <input
                    type="text"
                    value={newKeywordData.word_fr}
                    onChange={(e) => setNewKeywordData(prev => ({ ...prev, word_fr: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mot-clé (Anglais)</label>
                  <input
                    type="text"
                    value={newKeywordData.word_en}
                    onChange={(e) => setNewKeywordData(prev => ({ ...prev, word_en: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mot-clé (Arabe)</label>
                  <input
                    type="text"
                    value={newKeywordData.word_ar}
                    onChange={(e) => setNewKeywordData(prev => ({ ...prev, word_ar: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    dir="rtl"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowKeywordModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Annuler
                </button>
                <button
                  onClick={createNewKeyword}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Créer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Geographic Tree Modal */}
        {geoModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-3xl mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Sélectionner une localisation</h2>
                <button
                  onClick={() => setGeoModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mb-4 text-sm text-gray-600">
                Pays → Région → Province/Préfecture → Ville
              </div>
              <TreeView
                nodes={geoNodes}
                onNodeSelect={(node) => {
                  setFormData(prev => ({ ...prev, study_location_id: node.id }));
                  setSelectedGeoLabel(node.label);
                  setGeoModalOpen(false);
                }}
                multiSelect={false}
                searchable={true}
                maxHeight="500px"
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