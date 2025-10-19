import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Download, 
  Eye, 
  Quote, 
  Share2, 
  Heart, 
  HeartOff,
  User,
  Calendar,
  Building,
  BookOpen,
  FileText,
  Globe,
  ArrowLeft,
  MessageCircle,
  Star,
  Loader2,
  AlertCircle,
  Users
} from 'lucide-react';
import apiService from '../../services/api';

interface ThesisData {
  thesis: {
    id: string;
    title_fr?: string;
    title_ar?: string;
    title_en?: string;
    abstract_fr?: string;
    abstract_ar?: string;
    abstract_en?: string;
    thesis_number?: string;
    defense_date?: string;
    page_count?: number;
    status: string;
    file_url: string;
    file_name: string;
  };
  institution: {
    university?: { id?: string | null; name_fr?: string; name_en?: string; name_ar?: string };
    faculty?: { id?: string | null; name_fr?: string; name_en?: string; name_ar?: string };
    school?: { id?: string | null; name_fr?: string };
    department?: { id?: string | null; name_fr?: string };
  };
  academic: {
    degree?: { id?: string | null; name_fr?: string; name_en?: string; abbreviation?: string };
    language: { id: string; name?: string; code?: string };
  };
  persons: Array<{
    id: string;
    person_id: string;
    role: string;
    name?: string;
    name_ar?: string;
    title?: string;
    first_name?: string;
    last_name?: string;
    is_external?: boolean;
    institution?: string;
  }>;
  categories: Array<{
    id: string;
    category_id: string;
    code?: string;
    name_fr?: string;
    name_en?: string;
    name_ar?: string;
    is_primary: boolean;
  }>;
  keywords: Array<{
    id: string;
    keyword_id: string;
    keyword_fr?: string;
    keyword_en?: string;
    keyword_ar?: string;
    position?: number;
  }>;
  statistics?: {
    views?: number;
    downloads?: number;
  };
  metadata?: {
    created_at?: string;
    updated_at?: string;
  };
}

export default function ThesisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);
  const [showCiteModal, setShowCiteModal] = useState(false);
  const [activeTab, setActiveTab] = useState('resume');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [thesisData, setThesisData] = useState<ThesisData | null>(null);
  const [relatedTheses, setRelatedTheses] = useState<any[]>([]);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchThesisData = async () => {
      if (!id) {
        setError("ID de thèse manquant");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Fetch thesis details
        const response = await apiService.getPublicThesis(id);
        setThesisData(response.data);

        // Fetch related theses
        try {
          const relatedResponse = await apiService.getRelatedTheses(id, 3);
          setRelatedTheses(relatedResponse.data || []);
        } catch (err) {
          // Non-critical, just log
          console.warn('Failed to fetch related theses:', err);
        }
      } catch (err: any) {
        console.error('Error fetching thesis:', err);
        if (err.status === 404) {
          setError("Thèse non trouvée");
        } else {
          setError("Erreur lors du chargement de la thèse");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchThesisData();
  }, [id]);

  const handleDownload = async () => {
    if (!id || !thesisData) return;
    
    try {
      setDownloading(true);
      const blob = await apiService.downloadThesis(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = thesisData.thesis.file_name || 'thesis.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Échec du téléchargement. Veuillez réessayer.');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: thesisData?.thesis.title_fr || 'Thèse',
        url: window.location.href
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Lien copié dans le presse-papiers!');
    }
  };

  const getAuthors = () => {
    return thesisData?.persons.filter(p => p.role === 'author') || [];
  };

  const getDirectors = () => {
    return thesisData?.persons.filter(p => p.role === 'director' || p.role === 'co_director') || [];
  };

  const getJuryMembers = () => {
    return thesisData?.persons.filter(p => p.role.startsWith('jury_')) || [];
  };

  const formatRole = (role: string): string => {
    const roleMap: Record<string, string> = {
      'jury_president': 'Président',
      'jury_reporter': 'Rapporteur',
      'jury_examiner': 'Examinateur',
      'external_examiner': 'Examinateur externe'
    };
    return roleMap[role] || role;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Date non spécifiée';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const CitationModal = () => {
    if (!thesisData) return null;
    
    const authors = getAuthors();
    const authorName = authors[0]?.name || 'Auteur Inconnu';
    const title = thesisData.thesis.title_fr || 'Sans titre';
    const year = thesisData.thesis.defense_date 
      ? new Date(thesisData.thesis.defense_date).getFullYear()
      : new Date().getFullYear();
    const institution = thesisData.institution.university?.name_fr || 'Institution';

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-96 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">Citation de la thèse</h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Format APA (7ème édition)</label>
              <div className="bg-gray-50 p-4 rounded-lg text-sm font-mono leading-relaxed border">
                {authorName}. ({year}). <em>{title}</em> [Thèse de doctorat, {institution}]. Repository theses.ma.
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Format MLA (8ème édition)</label>
              <div className="bg-gray-50 p-4 rounded-lg text-sm font-mono leading-relaxed border">
                {authorName}. "{title}." Dissertation, {institution}, {year}.
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Format Chicago</label>
              <div className="bg-gray-50 p-4 rounded-lg text-sm font-mono leading-relaxed border">
                {authorName}. "{title}." PhD diss., {institution}, {year}.
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => setShowCiteModal(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
            >
              Fermer
            </button>
            <button 
              onClick={() => {
                const citation = `${authorName}. (${year}). ${title} [Thèse de doctorat, ${institution}]. Repository theses.ma.`;
                navigator.clipboard.writeText(citation);
                alert('Citation copiée!');
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Copier APA
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement de la thèse...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !thesisData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-6">{error || "Thèse introuvable"}</p>
          <button
            onClick={() => navigate('/search')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retour à la recherche
          </button>
        </div>
      </div>
    );
  }

  const thesis = thesisData.thesis;
  const authors = getAuthors();
  const directors = getDirectors();
  const juryMembers = getJuryMembers();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <Link
            to="/search"
            className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour aux résultats</span>
          </Link>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-4">
                    {thesis.title_fr || thesis.title_en || thesis.title_ar || 'Sans titre'}
                  </h1>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      {authors.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Auteur:</span>
                          <span className="font-medium text-gray-900">
                            {authors[0].title ? `${authors[0].title} ` : ''}{authors[0].name}
                          </span>
                        </div>
                      )}
                      {directors.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Directeur:</span>
                          <span className="font-medium text-gray-900">
                            {directors[0].title ? `${directors[0].title} ` : ''}{directors[0].name}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Soutenue le:</span>
                        <span className="font-medium text-gray-900">{formatDate(thesis.defense_date)}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {thesisData.institution.university?.name_fr && (
                        <div className="flex items-center space-x-2">
                          <Building className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Institution:</span>
                          <span className="font-medium text-gray-900">{thesisData.institution.university.name_fr}</span>
                        </div>
                      )}
                      {thesisData.academic.degree?.name_fr && (
                        <div className="flex items-center space-x-2">
                          <BookOpen className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Diplôme:</span>
                          <span className="font-medium text-gray-900">{thesisData.academic.degree.name_fr}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Langue:</span>
                        <span className="font-medium text-gray-900">{thesisData.academic.language.name || 'Français'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => setIsFavorite(!isFavorite)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors duration-200"
                    title="Ajouter aux favoris"
                  >
                    {isFavorite ? <Heart className="w-6 h-6 fill-current text-red-500" /> : <HeartOff className="w-6 h-6" />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                <button 
                  onClick={handleDownload}
                  disabled={downloading}
                  className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {downloading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                  <span>{downloading ? 'Téléchargement...' : 'Télécharger PDF'}</span>
                </button>
                <button
                  onClick={() => setShowCiteModal(true)}
                  className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                >
                  <Quote className="w-5 h-5" />
                  <span>Citer</span>
                </button>
                <button 
                  onClick={handleShare}
                  className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                >
                  <Share2 className="w-5 h-5" />
                  <span>Partager</span>
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {[
                    { id: 'resume', label: 'Résumé', icon: FileText },
                    { id: 'jury', label: 'Jury', icon: Users },
                  ].map((tab) => {
                    const IconComponent = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center space-x-2 py-4 border-b-2 transition-colors duration-200 ${
                          activeTab === tab.id
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'resume' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé</h3>
                    <div className="prose max-w-none text-gray-700 leading-relaxed">
                      {thesis.abstract_fr || thesis.abstract_en || thesis.abstract_ar ? (
                        <p>{thesis.abstract_fr || thesis.abstract_en || thesis.abstract_ar}</p>
                      ) : (
                        <p className="text-gray-500 italic">Résumé non disponible.</p>
                      )}
                    </div>
                    
                    {thesisData.keywords.length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-medium text-gray-900 mb-3">Mots-clés</h4>
                        <div className="flex flex-wrap gap-2">
                          {thesisData.keywords.map((keyword) => (
                            <span
                              key={keyword.id}
                              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                            >
                              {keyword.keyword_fr || keyword.keyword_en || keyword.keyword_ar}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {thesisData.categories.length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-medium text-gray-900 mb-3">Catégories</h4>
                        <div className="flex flex-wrap gap-2">
                          {thesisData.categories.map((category) => (
                            <span
                              key={category.id}
                              className={`px-3 py-1 rounded-full text-sm ${
                                category.is_primary 
                                  ? 'bg-secondary-100 text-secondary-800 font-medium' 
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {category.name_fr || category.code}
                              {category.is_primary && ' (Primaire)'}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'jury' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Membres du jury</h3>
                    {juryMembers.length > 0 ? (
                      <div className="space-y-3">
                        {juryMembers.map((member) => (
                          <div key={member.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                {member.title ? `${member.title} ` : ''}{member.name}
                              </div>
                              <div className="text-sm text-blue-600 font-medium">
                                {formatRole(member.role)}
                              </div>
                              {member.is_external && member.institution && (
                                <div className="text-sm text-gray-500 mt-1">
                                  {member.institution}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">Informations sur le jury non disponibles.</p>
                    )}

                    {directors.length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-medium text-gray-900 mb-3">Direction de thèse</h4>
                        <div className="space-y-2">
                          {directors.map((director) => (
                            <div key={director.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                              <User className="w-5 h-5 text-gray-400" />
                              <div>
                                <div className="font-medium text-gray-900">
                                  {director.title ? `${director.title} ` : ''}{director.name}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {director.role === 'co_director' ? 'Co-directeur' : 'Directeur'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiques</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Vues</span>
                  <span className="font-medium">{thesisData.statistics?.views?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Téléchargements</span>
                  <span className="font-medium">{thesisData.statistics?.downloads?.toLocaleString() || 0}</span>
                </div>
                {thesis.page_count && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Pages</span>
                    <span className="font-medium">{thesis.page_count}</span>
                  </div>
                )}
                {thesis.thesis_number && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Numéro</span>
                    <span className="font-medium">{thesis.thesis_number}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Related Theses */}
            {relatedTheses.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Thèses similaires</h3>
                <div className="space-y-4">
                  {relatedTheses.map((related: any) => (
                    <Link
                      key={related.id}
                      to={`/thesis/${related.id}`}
                      className="block p-3 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                    >
                      <h4 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
                        {related.title_fr || related.title_en || related.title_ar}
                      </h4>
                      <div className="text-xs text-gray-600">
                        {related.author_name} • {related.defense_date ? new Date(related.defense_date).getFullYear() : 'N/A'}
                      </div>
                      {related.university_name && (
                        <div className="text-xs text-gray-500 mt-1">
                          {related.university_name}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Institution Info */}
            {thesisData.institution.faculty?.name_fr && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Institution</h3>
                <div className="space-y-3 text-sm">
                  {thesisData.institution.university?.name_fr && (
                    <div>
                      <div className="text-gray-600 font-medium">Université</div>
                      <div className="text-gray-900">{thesisData.institution.university.name_fr}</div>
                    </div>
                  )}
                  {thesisData.institution.faculty?.name_fr && (
                    <div>
                      <div className="text-gray-600 font-medium">Faculté</div>
                      <div className="text-gray-900">{thesisData.institution.faculty.name_fr}</div>
                    </div>
                  )}
                  {thesisData.institution.department?.name_fr && (
                    <div>
                      <div className="text-gray-600 font-medium">Département</div>
                      <div className="text-gray-900">{thesisData.institution.department.name_fr}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCiteModal && <CitationModal />}
    </div>
  );
}
