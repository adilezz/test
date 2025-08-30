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
  Copy,
  ExternalLink,
  Loader
} from 'lucide-react';
import { thesesService } from '../../services/theses';
import { Thesis } from '../../types';
import ThesisCard from '../ui/ThesisCard';
import toast from 'react-hot-toast';

export default function ThesisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [thesis, setThesis] = useState<Thesis | null>(null);
  const [relatedTheses, setRelatedTheses] = useState<Thesis[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showCiteModal, setShowCiteModal] = useState(false);
  const [activeTab, setActiveTab] = useState('resume');

  useEffect(() => {
    const loadThesis = async () => {
      if (!id) return;

      try {
        const [thesisData, related] = await Promise.all([
          thesesService.getThesis(id),
          thesesService.getRelatedTheses(id)
        ]);
        
        setThesis(thesisData);
        setRelatedTheses(related);
        
        // Increment view count
        await thesesService.incrementViewCount(id);
      } catch (error) {
        console.error('Error loading thesis:', error);
        toast.error('Erreur lors du chargement de la thèse');
        navigate('/search');
      } finally {
        setLoading(false);
      }
    };

    loadThesis();
  }, [id, navigate]);

  const handleDownload = async () => {
    if (!thesis || thesis.availability !== 'available') {
      toast.error('Cette thèse n\'est pas disponible au téléchargement');
      return;
    }

    try {
      toast.loading('Préparation du téléchargement...', { id: 'download' });
      const downloadUrl = await thesesService.downloadThesis(thesis.id);
      
      // Create download link
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${thesis.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Téléchargement commencé', { id: 'download' });
    } catch (error) {
      toast.error('Erreur lors du téléchargement', { id: 'download' });
    }
  };

  const handleShare = () => {
    if (!thesis) return;
    
    const url = `${window.location.origin}/thesis/${thesis.id}`;
    if (navigator.share) {
      navigator.share({
        title: thesis.title,
        text: `Découvrez cette thèse par ${thesis.author}`,
        url: url
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Lien copié dans le presse-papiers');
    }
  };

  const toggleFavorite = async () => {
    if (!thesis) return;
    
    try {
      if (isFavorite) {
        await thesesService.removeFromFavorites(thesis.id);
        setIsFavorite(false);
        toast.success('Retiré des favoris');
      } else {
        await thesesService.addToFavorites(thesis.id);
        setIsFavorite(true);
        toast.success('Ajouté aux favoris');
      }
    } catch (error) {
      toast.error('Erreur lors de la modification des favoris');
    }
  };

  const CitationModal = () => {
    if (!thesis) return null;

    const citations = {
      apa: `${thesis.author} (${thesis.year}). <em>${thesis.title}</em> [Thèse de doctorat, ${thesis.institution}]. Repository theses.ma. ${window.location.href}`,
      mla: `${thesis.author}. "${thesis.title}." Dissertation, ${thesis.institution}, ${thesis.year}.`,
      chicago: `${thesis.author}. "${thesis.title}." PhD diss., ${thesis.institution}, ${thesis.year}.`,
      bibtex: `@phdthesis{${thesis.author.split(' ').join('').toLowerCase()}${thesis.year},
  title={${thesis.title}},
  author={${thesis.author}},
  year={${thesis.year}},
  school={${thesis.institution}},
  url={${window.location.href}}
}`
    };

    const copyCitation = (format: string) => {
      const citationText = citations[format as keyof typeof citations].replace(/<\/?em>/g, '');
      navigator.clipboard.writeText(citationText);
      toast.success(`Citation ${format.toUpperCase()} copiée`);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-96 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">Citation de la thèse</h3>
          <div className="space-y-6">
            {Object.entries(citations).map(([format, citation]) => (
              <div key={format}>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Format {format.toUpperCase()}
                  </label>
                  <button
                    onClick={() => copyCitation(format)}
                    className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copier</span>
                  </button>
                </div>
                <div 
                  className="bg-gray-50 p-4 rounded-lg text-sm leading-relaxed border font-mono whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: citation }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => setShowCiteModal(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-16 h-16 text-blue-600 mx-auto animate-spin mb-4" />
          <p className="text-gray-600">Chargement de la thèse...</p>
        </div>
      </div>
    );
  }

  if (!thesis) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Thèse non trouvée</h2>
          <p className="text-gray-600 mb-6">La thèse demandée n'existe pas ou n'est plus disponible.</p>
          <Link
            to="/search"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Retour à la recherche
          </Link>
        </div>
      </div>
    );
  }

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
                    {thesis.title}
                  </h1>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Auteur:</span>
                        <span className="font-medium text-gray-900">{thesis.author}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Directeur:</span>
                        <span className="font-medium text-gray-900">{thesis.director}</span>
                      </div>
                      {thesis.defendedDate && (
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Soutenue le:</span>
                          <span className="font-medium text-gray-900">{thesis.defendedDate}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Building className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Institution:</span>
                        <span className="font-medium text-gray-900">{thesis.institution}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <BookOpen className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Discipline:</span>
                        <span className="font-medium text-gray-900">{thesis.discipline}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Langue:</span>
                        <span className="font-medium text-gray-900">
                          {thesis.language === 'fr' ? 'Français' : 
                           thesis.language === 'ar' ? 'Arabe' :
                           thesis.language === 'en' ? 'Anglais' : 'Tamazight'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={toggleFavorite}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors duration-200"
                  >
                    {isFavorite ? <Heart className="w-6 h-6 fill-current text-red-500" /> : <HeartOff className="w-6 h-6" />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                {thesis.availability === 'available' && (
                  <>
                    <button 
                      onClick={handleDownload}
                      className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors duration-200"
                    >
                      <Download className="w-5 h-5" />
                      <span>Télécharger PDF</span>
                    </button>
                    <button className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200">
                      <Eye className="w-5 h-5" />
                      <span>Lire en ligne</span>
                    </button>
                  </>
                )}
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
                    { id: 'details', label: 'Détails', icon: BookOpen },
                    { id: 'commentaires', label: 'Avis', icon: MessageCircle }
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
                      <p>{thesis.abstract}</p>
                    </div>
                    
                    <div className="mt-6">
                      <h4 className="font-medium text-gray-900 mb-3">Mots-clés</h4>
                      <div className="flex flex-wrap gap-2">
                        {thesis.keywords.map((keyword, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm cursor-pointer hover:bg-blue-200 transition-colors duration-200"
                            onClick={() => navigate(`/search?q=${encodeURIComponent(keyword)}`)}
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'details' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations détaillées</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Informations générales</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Faculté:</span>
                              <span className="font-medium text-gray-900">{thesis.faculty}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Nombre de pages:</span>
                              <span className="font-medium text-gray-900">{thesis.pages}</span>
                            </div>
                            {thesis.subdiscipline && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Sous-discipline:</span>
                                <span className="font-medium text-gray-900">{thesis.subdiscipline}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Jury de thèse</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Directeur:</span>
                              <span className="font-medium text-gray-900">{thesis.director}</span>
                            </div>
                            {thesis.coDirector && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Co-directeur:</span>
                                <span className="font-medium text-gray-900">{thesis.coDirector}</span>
                              </div>
                            )}
                            {thesis.juryCo1 && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Examinateur 1:</span>
                                <span className="font-medium text-gray-900">{thesis.juryCo1}</span>
                              </div>
                            )}
                            {thesis.juryCo2 && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Examinateur 2:</span>
                                <span className="font-medium text-gray-900">{thesis.juryCo2}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'commentaires' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Avis et commentaires</h3>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4 mb-6">
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-5 h-5 ${i < Math.floor(thesis.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                          ))}
                        </div>
                        <span className="text-lg font-medium">{thesis.rating?.toFixed(1) || 'N/A'}/5</span>
                        <span className="text-gray-500">({thesis.reviewCount || 0} avis)</span>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-6 text-center">
                        <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600">
                          Les commentaires et avis seront bientôt disponibles. 
                          Connectez-vous pour être le premier à laisser un avis.
                        </p>
                      </div>
                    </div>
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
                  <span className="text-gray-600">Consultations</span>
                  <span className="font-medium">{thesis.viewCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Téléchargements</span>
                  <span className="font-medium">{thesis.downloadCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Citations</span>
                  <span className="font-medium">{thesis.citationCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Pages</span>
                  <span className="font-medium">{thesis.pages}</span>
                </div>
              </div>
            </div>

            {/* Related Theses */}
            {relatedTheses.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Thèses similaires</h3>
                <div className="space-y-4">
                  {relatedTheses.slice(0, 3).map((related) => (
                    <Link
                      key={related.id}
                      to={`/thesis/${related.id}`}
                      className="block p-3 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                    >
                      <h4 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
                        {related.title}
                      </h4>
                      <div className="text-xs text-gray-600">
                        {related.author} • {related.year}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {related.downloadCount} téléchargements
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Author */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contacter l'auteur</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{thesis.author}</div>
                    <div className="text-sm text-gray-600">{thesis.institution}</div>
                  </div>
                </div>
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200">
                  Envoyer un message
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Related Theses Section */}
        {relatedTheses.length > 3 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Autres thèses similaires</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {relatedTheses.slice(3, 6).map((thesis) => (
                <ThesisCard key={thesis.id} thesis={thesis} />
              ))}
            </div>
          </div>
        )}
      </div>

      {showCiteModal && <CitationModal />}
    </div>
  );
}