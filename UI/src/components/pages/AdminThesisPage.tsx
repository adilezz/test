import React, { useState, useEffect } from 'react';
import { 
  Upload,
  Check,
  X,
  Plus,
  Minus,
  Eye,
  EyeOff,
  Save,
  ArrowLeft,
  RefreshCw,
  UserPlus
} from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import AdminHeader from '../layout/AdminHeader';
import TreeView from '../ui/TreeView/TreeView';
import TreeSelect from '../ui/TreeSelect/TreeSelect';
import { TreeNode as UITreeNode } from '../../types/tree';
import { buildUnifiedInstitutionTree } from '../../utils/institutionTreeBuilder';
import { 
  ThesisCreate,
  ThesisUpdate, 
  UniversityResponse,
  FacultyResponse,
  DepartmentResponse,
  DegreeResponse,
  LanguageResponse,
  CategoryResponse,
  KeywordResponse,
  AcademicPersonResponse,
  PaginatedResponse,
  ThesisStatus,
  AcademicRole,
  ThesisAcademicPersonCreate,
  ThesisCategoryCreate,
  ThesisKeywordCreate,
  PrivateInstitutionResponse
} from '../../types/api';

interface AcademicPersonAssignment {
  id: string;
  person_id: string;
  role: AcademicRole;
  person_name?: string;
  is_external: boolean;
  external_institution_name?: string;
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
  
  
  // Reference data
  const [universities, setUniversities] = useState<UniversityResponse[]>([]);
  const [faculties, setFaculties] = useState<FacultyResponse[]>([]);
  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
  const [privateInstitutions, setPrivateInstitutions] = useState<PrivateInstitutionResponse[]>([]);
  const [unifiedInstitutionTree, setUnifiedInstitutionTree] = useState<UITreeNode[]>([]);
  const [degrees, setDegrees] = useState<DegreeResponse[]>([]);
  const [languages, setLanguages] = useState<LanguageResponse[]>([]);
  
  const [keywords, setKeywords] = useState<KeywordResponse[]>([]);
  const [academicPersons, setAcademicPersons] = useState<AcademicPersonResponse[]>([]);
  const [geographicEntities, setGeographicEntities] = useState<any[]>([]);
  const [geoModalOpen, setGeoModalOpen] = useState(false);
  const [geoNodes, setGeoNodes] = useState<UITreeNode[]>([]);
  const [selectedGeoLabel, setSelectedGeoLabel] = useState<string>('');
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryNodes, setCategoryNodes] = useState<UITreeNode[]>([]);
  const [categoryLabelById, setCategoryLabelById] = useState<Record<string, string>>({});

  // Form data
  const [formData, setFormData] = useState<ThesisCreate>({
    title_fr: '',
    title_en: '',
    title_ar: '',
    abstract_fr: '',
    abstract_en: '',
    abstract_ar: '',
    university_id: undefined,
    faculty_id: undefined,
    school_id: undefined,
    department_id: undefined,
    degree_id: undefined,
    thesis_number: '',
    study_location_id: undefined,
    defense_date: '',
    language_id: undefined,
    secondary_language_ids: [],
    page_count: 0,
    status: ThesisStatus.DRAFT,
    file_id: ''
  });

  const [academicPersonAssignments, setAcademicPersonAssignments] = useState<AcademicPersonAssignment[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [primaryCategoryId, setPrimaryCategoryId] = useState<string>('');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryData, setNewCategoryData] = useState({ 
    code: '', 
    name_fr: '', 
    name_en: '', 
    name_ar: '',
    level: 0,
    parent_id: ''
  });

  // Modals
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [showKeywordModal, setShowKeywordModal] = useState(false);
  const [newPersonData, setNewPersonData] = useState({ 
    first_name_fr: '', 
    last_name_fr: '', 
    complete_name_fr: '', 
    title: '',
    university_id: '',
    faculty_id: ''
  });
  const [newKeywordData, setNewKeywordData] = useState({ keyword_fr: '', keyword_en: '', keyword_ar: '' });

  useEffect(() => {
    loadReferenceData();
    if (isEditMode) {
      loadThesis();
    }
  }, [id]);

  useEffect(() => {
    if (universities.length > 0 || faculties.length > 0 || privateInstitutions.length > 0) {
      buildUnifiedTree();
    }
  }, [universities, faculties, privateInstitutions]);

  useEffect(() => {
    if (geographicEntities && formData.study_location_id) {
      const sel = geographicEntities.find((e) => e.id === formData.study_location_id);
      setSelectedGeoLabel(sel ? sel.name_fr : '');
    }
  }, [geographicEntities, formData.study_location_id]);

  const loadReferenceData = async () => {
    try {
      const form = await apiService.getThesisFormStructure();
      const ref = form.reference_data;
      setUniversities(ref.universities as any);
      setDegrees(ref.degrees as any);
      // languages with is_active already filtered
      setLanguages((ref.languages as any).map((l: any) => ({ id: l.id, code: l.code, name: l.name, native_name: '', rtl: false, is_active: true, display_order: 0, created_at: '', updated_at: '' })).slice());
      // categories tree mapping for tree selector
      const labelMap: Record<string, string> = {};
      const mapNode = (n: any, level: number = 0): UITreeNode => {
        labelMap[n.id] = n.name_fr;
        return {
          id: n.id,
          label: n.name_fr,
          type: 'category',
          level,
          count: 0,
          children: Array.isArray(n.children) ? n.children.map((c: any) => mapNode(c, level + 1)) : []
        };
      };
      const roots = Array.isArray((ref as any).categories_tree) ? (ref as any).categories_tree : [];
      setCategoryNodes(roots.map((n: any) => mapNode(n, 0)));
      setCategoryLabelById(labelMap);
      // load keywords via existing endpoint (not included in form)
      const [keywordsRes, academicPersonsRes, geoRes, privateInstRes] = await Promise.all([
        apiService.adminList<PaginatedResponse>('keywords', { load_all: 'true' }),
        apiService.adminList<PaginatedResponse>('academic_persons', { load_all: 'true' }),
        apiService.adminList<PaginatedResponse>('geographic_entities', { load_all: 'true' }),
        apiService.adminList<PaginatedResponse>('private_institutions', { load_all: 'true' })
      ]);
      setKeywords(keywordsRes.data);
      setAcademicPersons(academicPersonsRes.data);
      setGeographicEntities(geoRes.data);
      setPrivateInstitutions(privateInstRes.data);
    } catch (error) {
      console.error('Error loading reference data:', error);
    }
  };

  const buildUnifiedTree = () => {
    try {
      const departments: any[] = []; // We'll need to load departments if needed
      const unifiedTree = buildUnifiedInstitutionTree(
        universities,
        faculties,
        departments,
        privateInstitutions
      );
      setUnifiedInstitutionTree(unifiedTree);
    } catch (error) {
      console.error('Error building unified institution tree:', error);
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
      const response = await apiService.adminGetUniversityFaculties(universityId);
      setFaculties(response);
      setDepartments([]);
    } catch (error) {
      console.error('Error loading faculties:', error);
      setFaculties([]);
    }
  };

  const loadDepartments = async (facultyId: string) => {
    try {
      const response = await apiService.adminGetFacultyDepartments(facultyId);
      setDepartments(response);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const loadThesis = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const details = await apiService.getThesis(id);
      setFormData({
        title_fr: details.thesis.title_fr,
        title_en: details.thesis.title_en || '',
        title_ar: details.thesis.title_ar || '',
        abstract_fr: details.thesis.abstract_fr,
        abstract_en: details.thesis.abstract_en || '',
        abstract_ar: details.thesis.abstract_ar || '',
        university_id: (details.institution.university.id as string) || '',
        faculty_id: (details.institution.faculty.id as string) || '',
        school_id: (details.institution.school.id as string) || '',
        department_id: (details.institution.department.id as string) || '',
        degree_id: (details.academic.degree.id as string) || '',
        thesis_number: details.thesis.thesis_number || '',
        study_location_id: '',
        defense_date: details.thesis.defense_date || '',
        language_id: details.academic.language.id,
        secondary_language_ids: [],
        page_count: details.thesis.page_count || 0,
        status: details.thesis.status,
        file_id: ''
      });
      if (details.thesis.file_url) {
        setPdfUrl(details.thesis.file_url);
      }
      // Preload related selections
      if (Array.isArray(details.keywords)) {
        setSelectedKeywords(details.keywords.map(k => k.keyword_id));
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
    
    // Convert empty strings to undefined for UUID fields
    const uuidFields = ['university_id', 'faculty_id', 'school_id', 'department_id', 'degree_id', 'study_location_id', 'language_id'];
    const processedValue = uuidFields.includes(name) ? (value || undefined) : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  const handleUniversityChange = (universityId: string) => {
    setFormData(prev => ({
      ...prev,
      university_id: universityId || undefined,
      faculty_id: undefined,
      department_id: undefined
    }));
    setFaculties([]);
    setDepartments([]);
    if (universityId) {
      loadFaculties(universityId);
    }
  };

  const handleFacultyChange = (facultyId: string) => {
    setFormData(prev => ({
      ...prev,
      faculty_id: facultyId || undefined,
      department_id: undefined
    }));
    if (facultyId) {
      loadDepartments(facultyId);
    } else {
      setDepartments([]);
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
      // Create complete_name_fr from first and last names if not provided
      const personData = {
        ...newPersonData,
        complete_name_fr: newPersonData.complete_name_fr || `${newPersonData.first_name_fr} ${newPersonData.last_name_fr}`.trim(),
        university_id: newPersonData.university_id || formData.university_id || null,
        faculty_id: newPersonData.faculty_id || formData.faculty_id || null
      };
      
      const newPerson = await apiService.adminCreate<AcademicPersonResponse>('academic_persons', personData);
      setAcademicPersons(prev => [...prev, newPerson]);
      setNewPersonData({ 
        first_name_fr: '', 
        last_name_fr: '', 
        complete_name_fr: '', 
        title: '',
        university_id: '',
        faculty_id: ''
      });
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
      setNewKeywordData({ keyword_fr: '', keyword_en: '', keyword_ar: '' });
      setShowKeywordModal(false);
    } catch (error) {
      console.error('Error creating keyword:', error);
    }
  };

  const createNewCategory = async () => {
    try {
      const newCategory = await apiService.adminCreate<CategoryResponse>('categories', newCategoryData);
      setSelectedCategories(prev => [...prev, newCategory.id]);
      setNewCategoryData({ 
        code: '', 
        name_fr: '', 
        name_en: '', 
        name_ar: '',
        level: 0,
        parent_id: ''
      });
      setShowCategoryModal(false);
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.title_fr.trim()) {
      alert('Le titre en français est requis');
      return;
    }
    
    if (!formData.abstract_fr.trim()) {
      alert('Le résumé en français est requis');
      return;
    }
    
    if (!formData.defense_date) {
      alert('La date de soutenance est requise');
      return;
    }
    
    if (!formData.language_id) {
      alert('La langue principale est requise');
      return;
    }
    
    if (!formData.degree_id) {
      alert('Le diplôme est requis');
      return;
    }
    
    if (!formData.file_id && !isEditMode) {
      alert('Veuillez télécharger un fichier PDF');
      return;
    }

    // Basic constraints
    if (!formData.title_fr || !formData.abstract_fr || !formData.defense_date || !formData.language_id) {
      alert('Veuillez remplir les champs obligatoires.');
      return;
    }
    if (!isEditMode) {
      const hasAuthor = academicPersonAssignments.some(a => a.role === AcademicRole.AUTHOR && a.person_id);
      const hasDirector = academicPersonAssignments.some(a => a.role === AcademicRole.DIRECTOR && a.person_id);
      if (!hasAuthor || !hasDirector) {
        alert('Auteur et Directeur sont requis.');
        return;
      }
      if (!primaryCategoryId) {
        alert('Veuillez sélectionner une catégorie primaire.');
        return;
      }
    }
    // Validate defense date is not in the future
    const defenseDate = new Date(formData.defense_date);
    const today = new Date();
    if (defenseDate > today) {
      alert('La date de soutenance ne peut pas être dans le futur');
      return;
    }

    setSaving(true);
    try {
      if (isEditMode) {
        await apiService.updateThesis(id!, formData as ThesisUpdate);
      } else {
        // Clean up the form data - convert empty strings to null for UUID fields
        const cleanedFormData: ThesisCreate = {
          ...formData,
          university_id: formData.university_id || undefined,
          faculty_id: formData.faculty_id || undefined,
          school_id: formData.school_id || undefined,
          department_id: formData.department_id || undefined,
          degree_id: formData.degree_id || undefined,
          study_location_id: formData.study_location_id || undefined,
          language_id: formData.language_id || undefined,
        };
        
        const created = await apiService.createThesis(cleanedFormData);
        const thesisId = created.id;
        // Save academic persons
        for (const a of academicPersonAssignments) {
          if (!a.person_id) continue;
          const payload: ThesisAcademicPersonCreate = {
            thesis_id: thesisId,
            person_id: a.person_id,
            role: a.role,
            faculty_id: formData.faculty_id || undefined,
            is_external: a.is_external,
            external_institution_name: a.external_institution_name || undefined
          } as any;
          await apiService.addThesisAcademicPerson(thesisId, payload);
        }
        // Save categories (primary + secondary)
        if (primaryCategoryId) {
          const payload: ThesisCategoryCreate = {
            thesis_id: thesisId,
            category_id: primaryCategoryId,
            is_primary: true
          } as any;
          await apiService.addThesisCategory(thesisId, payload);
        }
        for (const cid of selectedCategories.filter(cid => cid !== primaryCategoryId)) {
          const payload: ThesisCategoryCreate = {
            thesis_id: thesisId,
            category_id: cid,
            is_primary: false
          } as any;
          await apiService.addThesisCategory(thesisId, payload);
        }
        // Save keywords
        for (let i = 0; i < selectedKeywords.length; i++) {
          const kid = selectedKeywords[i];
          const payload: ThesisKeywordCreate = {
            thesis_id: thesisId,
            keyword_id: kid,
            keyword_position: i + 1
          } as any;
          await apiService.addThesisKeyword(thesisId, payload);
        }
      }
      
      navigate('/admin/theses');
    } catch (error: any) {
      console.error('Error saving thesis:', error);
      
      // Better error handling
      let errorMessage = 'Erreur lors de la sauvegarde';
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      alert(`Erreur: ${errorMessage}`);
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
                      value={formData.university_id || ''}
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
                      Faculté
                    </label>
                    <select
                      name="faculty_id"
                      value={formData.faculty_id || ''}
                      onChange={(e) => handleFacultyChange(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!formData.university_id}
                    >
                      <option value="">Sélectionnez une faculté</option>
                      {faculties.map(faculty => (
                        <option key={faculty.id} value={faculty.id}>
                          {faculty.name_fr} {faculty.acronym && `(${faculty.acronym})`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Département
                    </label>
                    <select
                      name="department_id"
                      value={formData.department_id || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!formData.faculty_id}
                    >
                      <option value="">Sélectionnez un département</option>
                      {departments.map(department => (
                        <option key={department.id} value={department.id}>
                          {department.name_fr} {department.acronym && `(${department.acronym})`}
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
                      value={formData.degree_id || ''}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Numéro de thèse
                    </label>
                    <input
                      type="text"
                      name="thesis_number"
                      value={formData.thesis_number}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="ex: TH-2024-001"
                    />
                  </div>

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
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Langue principale *
                    </label>
                    <select
                      name="language_id"
                      value={formData.language_id || ''}
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
                      onChange={(e) => setFormData(prev => ({ ...prev, study_location_id: e.target.value || undefined }))}
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
                                  {person.first_name_fr} {person.last_name_fr}
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
                              <option value={AcademicRole.JURY_EXAMINER}>Examinateur</option>
                              <option value={AcademicRole.JURY_REPORTER}>Rapporteur</option>
                              <option value={AcademicRole.EXTERNAL_EXAMINER}>Examinateur externe</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Catégories
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-600">Catégorie primaire *</div>
                      <button
                        type="button"
                        onClick={() => setCategoryModalOpen(true)}
                        className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                      >
                        Parcourir…
                      </button>
                    </div>
                    {primaryCategoryId && (
                      <div className="text-sm text-gray-800">Sélectionné: {categoryLabelById[primaryCategoryId] || primaryCategoryId}</div>
                    )}
                    {selectedCategories.length > 0 && (
                      <div className="text-xs text-gray-600">Secondaires: {selectedCategories.map(id => categoryLabelById[id] || id).join(', ')}</div>
                    )}
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
                          <span className="text-sm text-gray-900">{keyword.keyword_fr}</span>
                          {keyword.keyword_en && (
                            <span className="text-sm text-gray-500">({keyword.keyword_en})</span>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prénom (Français) *</label>
                  <input
                    type="text"
                    value={newPersonData.first_name_fr}
                    onChange={(e) => setNewPersonData(prev => ({ ...prev, first_name_fr: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom (Français) *</label>
                  <input
                    type="text"
                    value={newPersonData.last_name_fr}
                    onChange={(e) => setNewPersonData(prev => ({ ...prev, last_name_fr: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom complet (Français)</label>
                  <input
                    type="text"
                    value={newPersonData.complete_name_fr}
                    onChange={(e) => setNewPersonData(prev => ({ ...prev, complete_name_fr: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Laissez vide pour générer automatiquement"
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Université</label>
                  <select
                    value={newPersonData.university_id}
                    onChange={(e) => setNewPersonData(prev => ({ ...prev, university_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionnez une université</option>
                    {universities.map(university => (
                      <option key={university.id} value={university.id}>
                        {university.name_fr} {university.acronym && `(${university.acronym})`}
                      </option>
                    ))}
                  </select>
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

        {/* Category Tree Modal */}
        {categoryModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-3xl mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Sélectionner des catégories</h2>
                <button
                  onClick={() => setCategoryModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mb-4 text-sm text-gray-600">
                Choisissez une catégorie primaire et des catégories secondaires (facultatif)
              </div>
              <TreeView
                nodes={categoryNodes}
                onNodeSelect={(node, _opts) => {
                  // If nothing selected yet, set primary; else toggle in secondary list
                  if (!primaryCategoryId) {
                    setPrimaryCategoryId(node.id);
                  } else if (node.id === primaryCategoryId) {
                    // toggle off primary
                    setPrimaryCategoryId('');
                  } else {
                    setSelectedCategories(prev => prev.includes(node.id) ? prev.filter(id => id !== node.id) : [...prev, node.id]);
                  }
                }}
                multiSelect={true}
                searchable={true}
                maxHeight="500px"
                showCounts={false}
                showIcons={true}
              />
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setCategoryModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Fermer
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
                    value={newKeywordData.keyword_fr}
                    onChange={(e) => setNewKeywordData(prev => ({ ...prev, keyword_fr: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mot-clé (Anglais)</label>
                  <input
                    type="text"
                    value={newKeywordData.keyword_en}
                    onChange={(e) => setNewKeywordData(prev => ({ ...prev, keyword_en: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mot-clé (Arabe)</label>
                  <input
                    type="text"
                    value={newKeywordData.keyword_ar}
                    onChange={(e) => setNewKeywordData(prev => ({ ...prev, keyword_ar: e.target.value }))}
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

        {/* New Category Modal */}
        {showCategoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Nouvelle Catégorie</h3>
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Code *</label>
                  <input
                    type="text"
                    value={newCategoryData.code}
                    onChange={(e) => setNewCategoryData(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                    placeholder="ex: CS, MATH, etc."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom (Français) *</label>
                  <input
                    type="text"
                    value={newCategoryData.name_fr}
                    onChange={(e) => setNewCategoryData(prev => ({ ...prev, name_fr: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom (Anglais)</label>
                  <input
                    type="text"
                    value={newCategoryData.name_en}
                    onChange={(e) => setNewCategoryData(prev => ({ ...prev, name_en: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom (Arabe)</label>
                  <input
                    type="text"
                    value={newCategoryData.name_ar}
                    onChange={(e) => setNewCategoryData(prev => ({ ...prev, name_ar: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    dir="rtl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Niveau</label>
                  <input
                    type="number"
                    value={newCategoryData.level}
                    onChange={(e) => setNewCategoryData(prev => ({ ...prev, level: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="10"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Annuler
                </button>
                <button
                  onClick={createNewCategory}
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