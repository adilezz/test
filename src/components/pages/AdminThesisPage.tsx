import React, { useState } from 'react';
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
  ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface JuryMember {
  id: string;
  name: string;
  institution: string;
  role: string;
}

export default function AdminThesisPage() {
  const [showPdfViewer, setShowPdfViewer] = useState(true);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [juryMembers, setJuryMembers] = useState<JuryMember[]>([
    { id: '1', name: '', institution: '', role: 'Président' }
  ]);
  
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    director: '',
    coDirector: '',
    institution: '',
    faculty: '',
    discipline: '',
    subDiscipline: '',
    year: '',
    language: 'fr',
    keywords: '',
    abstract: '',
    defendedDate: '',
    pages: '',
    status: 'pending'
  });

  // Moroccan universities faculties
  const faculties = [
    'Faculté de Médecine et de Pharmacie',
    'Faculté des Sciences',
    'Faculté des Sciences Juridiques, Économiques et Sociales',
    'Faculté des Lettres et des Sciences Humaines',
    'École Nationale Supérieure d\'Informatique et d\'Analyse des Systèmes',
    'École Mohammadia d\'Ingénieurs',
    'Faculté des Sciences de l\'Éducation',
    'École Nationale de Commerce et de Gestion',
    'École Supérieure de Technologie',
    'Faculté Polydisciplinaire'
  ];

  // Disciplines and sub-disciplines mapping
  const disciplinesMap = {
    'Médecine': [
      'Médecine Interne',
      'Chirurgie',
      'Pédiatrie',
      'Gynécologie-Obstétrique',
      'Cardiologie',
      'Neurologie',
      'Psychiatrie',
      'Radiologie',
      'Anesthésie-Réanimation',
      'Médecine d\'Urgence'
    ],
    'Sciences': [
      'Mathématiques',
      'Physique',
      'Chimie',
      'Biologie',
      'Géologie',
      'Informatique',
      'Sciences de la Terre',
      'Sciences de l\'Environnement'
    ],
    'Sciences Juridiques': [
      'Droit Public',
      'Droit Privé',
      'Droit International',
      'Droit des Affaires',
      'Droit Pénal',
      'Droit Constitutionnel'
    ],
    'Économie': [
      'Économie et Gestion',
      'Finance',
      'Marketing',
      'Management',
      'Comptabilité',
      'Économie Internationale'
    ],
    'Lettres': [
      'Littérature Arabe',
      'Littérature Française',
      'Linguistique',
      'Histoire',
      'Géographie',
      'Philosophie',
      'Sociologie',
      'Anthropologie'
    ],
    'Ingénierie': [
      'Génie Civil',
      'Génie Électrique',
      'Génie Mécanique',
      'Génie Informatique',
      'Génie Industriel',
      'Génie des Procédés'
    ]
  };

  const juryRoles = [
    'Président',
    'Rapporteur',
    'Examinateur',
    'Invité',
    'Co-directeur'
  ];

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      
      // Create URL for PDF preview
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      
      // Auto-extract metadata (simulation)
      setTimeout(() => {
        setFormData(prev => ({
          ...prev,
          title: 'Titre extrait du PDF',
          author: 'Auteur détecté',
          pages: '287'
        }));
      }, 1000);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const addJuryMember = () => {
    if (juryMembers.length < 10) {
      setJuryMembers(prev => [...prev, {
        id: Date.now().toString(),
        name: '',
        institution: '',
        role: 'Examinateur'
      }]);
    }
  };

  const removeJuryMember = (id: string) => {
    if (juryMembers.length > 1) {
      setJuryMembers(prev => prev.filter(member => member.id !== id));
    }
  };

  const updateJuryMember = (id: string, field: keyof JuryMember, value: string) => {
    setJuryMembers(prev => prev.map(member => 
      member.id === id ? { ...member, [field]: value } : member
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Form data:', formData);
    console.log('Jury members:', juryMembers);
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
          <h1 className="text-3xl font-bold text-gray-900">Administration des thèses</h1>
          <p className="text-gray-600 mt-2">Gérer les métadonnées et valider les thèses</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* PDF Viewer Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Document PDF</h2>
                <button
                  onClick={() => setShowPdfViewer(!showPdfViewer)}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                >
                  {showPdfViewer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{showPdfViewer ? 'Masquer' : 'Afficher'}</span>
                </button>
              </div>

              {!uploadedFile ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Télécharger le PDF de la thèse
                  </h3>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileInput}
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
                  <div className="flex items-center space-x-3 mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <Check className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">Fichier chargé</p>
                      <p className="text-sm text-green-600">{uploadedFile.name}</p>
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
            <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Métadonnées de la thèse</h2>
              
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titre de la thèse *
                    </label>
                    <textarea
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Titre complet de la thèse"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        placeholder="Nom du directeur"
                      />
                    </div>
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
                </div>

                {/* Institution and Faculty */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <option value="ump_oujda">Université Mohammed Premier (Oujda)</option>
                      <option value="uh2_casa">Université Hassan II (Casablanca)</option>
                      <option value="um5_rabat">Université Mohammed V (Rabat)</option>
                      <option value="uca_marrakech">Université Cadi Ayyad (Marrakech)</option>
                      <option value="uit_kenitra">Université Ibn Tofail (Kénitra)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Faculté *
                    </label>
                    <select
                      name="faculty"
                      value={formData.faculty}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sélectionnez une faculté</option>
                      {faculties.map(faculty => (
                        <option key={faculty} value={faculty}>{faculty}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Discipline and Sub-discipline */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      {Object.keys(disciplinesMap).map(discipline => (
                        <option key={discipline} value={discipline}>{discipline}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sous-discipline *
                    </label>
                    <select
                      name="subDiscipline"
                      value={formData.subDiscipline}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!formData.discipline}
                    >
                      <option value="">Sélectionnez une sous-discipline</option>
                      {formData.discipline && disciplinesMap[formData.discipline as keyof typeof disciplinesMap]?.map(subDiscipline => (
                        <option key={subDiscipline} value={subDiscipline}>{subDiscipline}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Année *
                    </label>
                    <input
                      type="number"
                      name="year"
                      value={formData.year}
                      onChange={handleInputChange}
                      min="1980"
                      max="2025"
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de pages
                    </label>
                    <input
                      type="number"
                      name="pages"
                      value={formData.pages}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
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

                {/* Jury Members */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Membres du jury
                    </label>
                    <button
                      type="button"
                      onClick={addJuryMember}
                      disabled={juryMembers.length >= 10}
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ajouter</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {juryMembers.map((member, index) => (
                      <div key={member.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-700">
                            Membre {index + 1}
                          </span>
                          {juryMembers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeJuryMember(member.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <input
                              type="text"
                              placeholder="Nom complet"
                              value={member.name}
                              onChange={(e) => updateJuryMember(member.id, 'name', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              placeholder="Institution"
                              value={member.institution}
                              onChange={(e) => updateJuryMember(member.id, 'institution', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                          </div>
                          <div>
                            <select
                              value={member.role}
                              onChange={(e) => updateJuryMember(member.id, 'role', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            >
                              {juryRoles.map(role => (
                                <option key={role} value={role}>{role}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Keywords and Abstract */}
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
                    placeholder="Séparez les mots-clés par des virgules"
                  />
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
                    placeholder="Résumé de la thèse"
                  />
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
                  >
                    <option value="pending">En attente</option>
                    <option value="approved">Approuvée</option>
                    <option value="rejected">Rejetée</option>
                    <option value="revision">Révision demandée</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors duration-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  <Save className="w-4 h-4" />
                  <span>Sauvegarder</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}