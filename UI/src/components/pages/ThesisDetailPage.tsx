import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
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
  Star
} from 'lucide-react';

export default function ThesisDetailPage() {
  const { id } = useParams();
  const [isFavorite, setIsFavorite] = useState(false);
  const [showCiteModal, setShowCiteModal] = useState(false);
  const [activeTab, setActiveTab] = useState('resume');

  // Mock data - in real app would fetch from API
  const thesis = {
    id: '1',
    title: 'L\'impact de l\'intelligence artificielle sur le diagnostic médical au Maroc',
    author: 'Dr. Fatima Zahra Benali',
    director: 'Pr. Mohammed Alami',
    institution: 'Université Mohammed Premier de Oujda',
    faculty: 'Faculté de médecine et de pharmacie',
    year: 2024,
    discipline: 'Médecine',
    subdiscipline: 'Intelligence Artificielle Médicale',
    abstract: 'Cette thèse examine l\'application de l\'intelligence artificielle dans le domaine du diagnostic médical au Maroc. L\'étude analyse l\'efficacité des algorithmes d\'apprentissage automatique dans la détection précoce de diverses pathologies, notamment les maladies cardiovasculaires et le cancer. La recherche évalue également les défis éthiques, techniques et réglementaires liés à l\'implémentation de ces technologies dans le système de santé marocain. Les résultats montrent une amélioration significative de la précision diagnostique tout en soulevant des questions importantes sur la formation du personnel médical et l\'acceptation des patients.',
    keywords: ['Intelligence Artificielle', 'Diagnostic Médical', 'Apprentissage Automatique', 'Santé Numérique', 'Maroc'],
    availability: 'available' as const,
    downloadCount: 1234,
    viewCount: 5678,
    pages: 287,
    language: 'Français',
    defendedDate: '15 mars 2024',
    juryCo1: 'Pr. Ahmed Bennani',
    juryCo2: 'Pr. Laila Benali',
    rating: 4.8,
    citations: 12
  };

  const relatedTheses = [
    {
      id: '2',
      title: 'Machine Learning appliqué à l\'imagerie médicale',
      author: 'Dr. Karim Bennani',
      year: 2023,
      downloads: 876
    },
    {
      id: '3',
      title: 'Éthique et IA en médecine',
      author: 'Dr. Salma Cherif',
      year: 2023,
      downloads: 654
    }
  ];

  const CitationModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-96 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Citation de la thèse</h3>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Format APA (7ème édition)</label>
            <div className="bg-gray-50 p-4 rounded-lg text-sm font-mono leading-relaxed border">
              Benali, F. Z. ({thesis.year}). <em>{thesis.title}</em> [Thèse de doctorat, {thesis.institution}]. Repository theses.ma.
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Format MLA (8ème édition)</label>
            <div className="bg-gray-50 p-4 rounded-lg text-sm font-mono leading-relaxed border">
              Benali, Fatima Zahra. "{thesis.title}." Dissertation, {thesis.institution}, {thesis.year}.
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Format Chicago</label>
            <div className="bg-gray-50 p-4 rounded-lg text-sm font-mono leading-relaxed border">
              Benali, Fatima Zahra. "{thesis.title}." PhD diss., {thesis.institution}, {thesis.year}.
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
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200">
            Copier tout
          </button>
        </div>
      </div>
    </div>
  );

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
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Soutenue le:</span>
                        <span className="font-medium text-gray-900">{thesis.defendedDate}</span>
                      </div>
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
                        <span className="font-medium text-gray-900">{thesis.language}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => setIsFavorite(!isFavorite)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors duration-200"
                  >
                    {isFavorite ? <Heart className="w-6 h-6 fill-current text-red-500" /> : <HeartOff className="w-6 h-6" />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                <button className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors duration-200">
                  <Download className="w-5 h-5" />
                  <span>Télécharger PDF</span>
                </button>
                <button className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200">
                  <Eye className="w-5 h-5" />
                  <span>Lire en ligne</span>
                </button>
                <button
                  onClick={() => setShowCiteModal(true)}
                  className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                >
                  <Quote className="w-5 h-5" />
                  <span>Citer</span>
                </button>
                <button className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors duration-200">
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
                    { id: 'sommaire', label: 'Sommaire', icon: BookOpen },
                    { id: 'commentaires', label: 'Commentaires', icon: MessageCircle }
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
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'sommaire' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Table des matières</h3>
                    <div className="space-y-2">
                      {[
                        'Introduction générale',
                        'Chapitre 1: État de l\'art',
                        'Chapitre 2: Méthodologie',
                        'Chapitre 3: Résultats et analyse',
                        'Chapitre 4: Discussion',
                        'Conclusion et perspectives',
                        'Bibliographie',
                        'Annexes'
                      ].map((chapter, index) => (
                        <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                          <span className="text-gray-700">{chapter}</span>
                          <span className="text-sm text-gray-500">Page {(index + 1) * 35}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'commentaires' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Commentaires et avis</h3>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4 mb-6">
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-5 h-5 ${i < 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                          ))}
                        </div>
                        <span className="text-lg font-medium">{thesis.rating}/5</span>
                        <span className="text-gray-500">(24 avis)</span>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-600 text-center">
                          Les commentaires seront bientôt disponibles. 
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
                  <span className="text-gray-600">Vues</span>
                  <span className="font-medium">{thesis.viewCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Téléchargements</span>
                  <span className="font-medium">{thesis.downloadCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Citations</span>
                  <span className="font-medium">{thesis.citations}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Pages</span>
                  <span className="font-medium">{thesis.pages}</span>
                </div>
              </div>
            </div>

            {/* Related Theses */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Thèses similaires</h3>
              <div className="space-y-4">
                {relatedTheses.map((related) => (
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
                      {related.downloads} téléchargements
                    </div>
                  </Link>
                ))}
              </div>
            </div>

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
      </div>

      {showCiteModal && <CitationModal />}
    </div>
  );
}