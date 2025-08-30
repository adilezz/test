import React, { useState } from 'react';
import { 
  Upload, 
  FileText, 
  Check, 
  AlertCircle, 
  X,
  ChevronRight,
  Loader
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { thesesService } from '../../services/theses';
import toast from 'react-hot-toast';

export default function UploadPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [submissionId, setSubmissionId] = useState<string>('');
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    director: '',
    coDirector: '',
    institution: '',
    faculty: '',
    discipline: '',
    subdiscipline: '',
    year: new Date().getFullYear(),
    defendedDate: '',
    language: 'fr',
    keywords: '',
    abstract: '',
    juryCo1: '',
    juryCo2: ''
  });

  const steps = [
    { id: 1, title: 'Upload du fichier', description: 'Téléchargez votre thèse en PDF' },
    { id: 2, title: 'Métadonnées', description: 'Informations sur la thèse' },
    { id: 3, title: 'Révision', description: 'Vérifiez les informations' },
    { id: 4, title: 'Confirmation', description: 'Soumission terminée' }
  ];

  const institutions = [
    'Université Mohammed Premier de Oujda',
    'Université Hassan II de Casablanca',
    'Université Mohammed V de Rabat',
    'Université Cadi Ayyad de Marrakech',
    'Université Ibn Tofail de Kénitra',
    'Université Sidi Mohamed Ben Abdellah de Fès',
    'Université Hassan 1er de Settat'
  ];

  const disciplines = [
    'Médecine',
    'Sciences',
    'Économie et Gestion',
    'Lettres et Sciences Humaines',
    'Droit et Sciences Politiques',
    'Ingénierie et Technologie',
    'Sciences de l\'Éducation',
    'Agriculture et Vétérinaire'
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Seuls les fichiers PDF sont acceptés');
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB
      toast.error('Le fichier ne peut pas dépasser 50 MB');
      return;
    }

    setUploadedFile(file);
    setIsProcessing(true);
    
    // Simulate metadata extraction
    setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        title: file.name.replace('.pdf', '').replace(/[-_]/g, ' '),
        author: 'Auteur à renseigner'
      }));
      setIsProcessing(false);
      setCurrentStep(2);
      toast.success('Fichier téléchargé avec succès');
    }, 2000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'year' ? parseInt(value) || new Date().getFullYear() : value
    }));
  };

  const validateMetadata = () => {
    const required = ['title', 'author', 'director', 'institution', 'faculty', 'discipline', 'abstract', 'keywords'];
    const missing = required.filter(field => !formData[field as keyof typeof formData]);
    
    if (missing.length > 0) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return false;
    }

    if (formData.abstract.length < 200) {
      toast.error('Le résumé doit contenir au moins 200 caractères');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!uploadedFile) {
      toast.error('Aucun fichier sélectionné');
      return;
    }

    if (!validateMetadata()) {
      return;
    }

    setIsProcessing(true);
    try {
      const keywordsArray = formData.keywords.split(',').map(k => k.trim()).filter(k => k);
      
      const thesisData = {
        ...formData,
        keywords: keywordsArray
      };

      const result = await thesesService.uploadThesis(thesisData, uploadedFile);
      setSubmissionId(result.id);
      setCurrentStep(4);
      toast.success('Thèse soumise avec succès !');
    } catch (error) {
      toast.error('Erreur lors de la soumission');
    } finally {
      setIsProcessing(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 2 && !validateMetadata()) {
      return;
    }
    if (currentStep === 3) {
      handleSubmit();
    } else if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.id 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : 'border-gray-300 text-gray-400'
                }`}>
                  {currentStep > step.id ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>
                <div className="ml-3 hidden sm:block">
                  <p className={`text-sm font-medium ${
                    currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <ChevronRight className="w-5 h-5 text-gray-300 mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Téléchargez votre thèse</h2>
              
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 ${
                  dragActive 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {isProcessing ? (
                  <div className="space-y-4">
                    <Loader className="w-16 h-16 text-blue-600 mx-auto animate-spin" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Traitement du fichier...
                    </h3>
                    <p className="text-gray-600">
                      Extraction des métadonnées en cours
                    </p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Glissez-déposez votre fichier PDF ici
                    </h3>
                    <p className="text-gray-600 mb-4">
                      ou cliquez pour sélectionner un fichier
                    </p>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileInput}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 cursor-pointer transition-colors duration-200"
                    >
                      <span>Choisir un fichier</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-4">
                      Taille maximale: 50 MB • Format accepté: PDF uniquement
                    </p>
                  </>
                )}
              </div>

              {uploadedFile && !isProcessing && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">Fichier téléchargé avec succès</p>
                      <p className="text-sm text-green-600">{uploadedFile.name}</p>
                      <p className="text-xs text-green-600">
                        Taille: {Math.round(uploadedFile.size / 1024 / 1024 * 100) / 100} MB
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Informations de la thèse</h2>
              
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titre de la thèse *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Titre complet de la thèse"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Auteur *
                    </label>
                    <input
                      type="text"
                      name="author"
                      value={formData.author}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nom complet de l'auteur"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Directeur de thèse *
                    </label>
                    <input
                      type="text"
                      name="director"
                      value={formData.director}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nom du directeur de thèse"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Co-directeur (optionnel)
                    </label>
                    <input
                      type="text"
                      name="coDirector"
                      value={formData.coDirector}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nom du co-directeur"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Institution *
                    </label>
                    <select
                      name="institution"
                      value={formData.institution}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sélectionnez une institution</option>
                      {institutions.map((institution) => (
                        <option key={institution} value={institution}>
                          {institution}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Faculté *
                    </label>
                    <input
                      type="text"
                      name="faculty"
                      value={formData.faculty}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Faculté des Sciences, Faculté de Médecine..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discipline *
                    </label>
                    <select
                      name="discipline"
                      value={formData.discipline}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sélectionnez une discipline</option>
                      {disciplines.map((discipline) => (
                        <option key={discipline} value={discipline}>
                          {discipline}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sous-discipline
                    </label>
                    <input
                      type="text"
                      name="subdiscipline"
                      value={formData.subdiscipline}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Spécialisation ou sous-domaine"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Année de soutenance *
                    </label>
                    <input
                      type="number"
                      name="year"
                      value={formData.year}
                      onChange={handleInputChange}
                      min="1980"
                      max="2025"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="2024"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date de soutenance
                    </label>
                    <input
                      type="date"
                      name="defendedDate"
                      value={formData.defendedDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Langue *
                    </label>
                    <select
                      name="language"
                      value={formData.language}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="fr">Français</option>
                      <option value="ar">Arabe</option>
                      <option value="en">Anglais</option>
                      <option value="tzm">Tamazight</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mots-clés *
                  </label>
                  <input
                    type="text"
                    name="keywords"
                    value={formData.keywords}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Intelligence artificielle, machine learning, diagnostic médical, santé numérique"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Séparez les mots-clés par des virgules (minimum 3)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Résumé *
                  </label>
                  <textarea
                    name="abstract"
                    value={formData.abstract}
                    onChange={handleInputChange}
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Résumé détaillé de votre thèse (minimum 200 caractères)"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    {formData.abstract.length}/200 caractères minimum
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Membre du jury 1
                    </label>
                    <input
                      type="text"
                      name="juryCo1"
                      value={formData.juryCo1}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nom du premier membre du jury"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Membre du jury 2
                    </label>
                    <input
                      type="text"
                      name="juryCo2"
                      value={formData.juryCo2}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nom du deuxième membre du jury"
                    />
                  </div>
                </div>
              </form>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Révision des informations</h2>
              
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Fichier téléchargé</h3>
                  <div className="flex items-center space-x-3">
                    <FileText className="w-8 h-8 text-red-600" />
                    <div>
                      <p className="font-medium">{uploadedFile?.name}</p>
                      <p className="text-sm text-gray-600">
                        {uploadedFile?.size ? Math.round(uploadedFile.size / 1024 / 1024 * 100) / 100 : 0} MB
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Métadonnées</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Titre:</span>
                      <p className="text-gray-900">{formData.title}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Auteur:</span>
                      <p className="text-gray-900">{formData.author}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Directeur:</span>
                      <p className="text-gray-900">{formData.director}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Institution:</span>
                      <p className="text-gray-900">{formData.institution}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Faculté:</span>
                      <p className="text-gray-900">{formData.faculty}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Discipline:</span>
                      <p className="text-gray-900">{formData.discipline}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Année:</span>
                      <p className="text-gray-900">{formData.year}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Langue:</span>
                      <p className="text-gray-900">
                        {formData.language === 'fr' ? 'Français' : 
                         formData.language === 'ar' ? 'Arabe' :
                         formData.language === 'en' ? 'Anglais' : 'Tamazight'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="font-medium text-gray-600">Mots-clés:</span>
                    <p className="text-gray-900">{formData.keywords}</p>
                  </div>
                  <div className="mt-4">
                    <span className="font-medium text-gray-600">Résumé:</span>
                    <p className="text-gray-900 text-sm mt-1">{formData.abstract}</p>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">
                        Processus de vérification
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        Votre thèse sera examinée par notre équipe avant publication. 
                        Vous recevrez une notification par email une fois validée (24-48h).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Thèse soumise avec succès !
              </h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Votre thèse a été soumise et est en cours de validation. 
                Vous recevrez un email de confirmation sous 24-48 heures.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto mb-6">
                <p className="text-sm font-medium text-blue-800">
                  ID de suivi: <span className="font-mono">{submissionId || 'TH-2024-001234'}</span>
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => navigate('/my-theses')}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Voir mes thèses
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                >
                  Retour à l'accueil
                </button>
              </div>
            </div>
          )}

          {/* Navigation */}
          {currentStep < 4 && (
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={prevStep}
                disabled={currentStep === 1 || isProcessing}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Précédent
              </button>
              <button
                onClick={nextStep}
                disabled={(currentStep === 1 && !uploadedFile) || isProcessing}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isProcessing ? (
                  <div className="flex items-center space-x-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Traitement...</span>
                  </div>
                ) : (
                  currentStep === 3 ? 'Soumettre' : 'Suivant'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}