import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  BookOpen, 
  Users, 
  Database, 
  Award,
  TrendingUp,
  Globe,
  Shield
} from 'lucide-react';
import SearchBar from '../ui/SearchBar';

export default function HomePage() {
  const stats = [
    { label: 'Thèses disponibles', value: '12,847', icon: BookOpen },
    { label: 'Universités partenaires', value: '47', icon: Users },
    { label: 'Disciplines couvertes', value: '156', icon: Database },
    { label: 'Téléchargements', value: '89,342', icon: TrendingUp }
  ];

  const featuredTheses = [
    {
      id: '1',
      title: 'Intelligence artificielle dans le diagnostic médical',
      author: 'Dr. Fatima Zahra Benali',
      institution: 'Université Mohammed V',
      year: 2024,
      discipline: 'Médecine',
      downloads: 1234
    },
    {
      id: '2', 
      title: 'Développement durable et économie verte au Maroc',
      author: 'Dr. Youssef Alami',
      institution: 'Université Hassan II',
      year: 2024,
      discipline: 'Économie',
      downloads: 987
    },
    {
      id: '3',
      title: 'Préservation du patrimoine culturel amazigh',
      author: 'Dr. Aicha Idrissi',
      institution: 'Université Ibn Tofail',
      year: 2023,
      discipline: 'Sciences Sociales',
      downloads: 756
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-teal-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Découvrez la recherche
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-600"> académique</span>
              <br />marocaine
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              La plateforme centralisée pour explorer, partager et citer les thèses 
              des universités marocaines. Accédez à plus de 12,000 travaux de recherche.
            </p>
            
            <div className="max-w-2xl mx-auto mb-8">
              <SearchBar />
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/search"
                className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <Search className="w-5 h-5" />
                <span>Explorer les thèses</span>
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center space-x-2 bg-white text-gray-700 px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <Users className="w-5 h-5" />
                <span>Rejoindre la communauté</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div key={index} className="text-center group">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-100 to-teal-100 rounded-lg mb-4 group-hover:from-blue-200 group-hover:to-teal-200 transition-all duration-200">
                    <IconComponent className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Theses */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Thèses en vedette
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Découvrez les recherches les plus consultées et les plus récentes
              de nos universités partenaires.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {featuredTheses.map((thesis) => (
              <div key={thesis.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 group">
                <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <BookOpen className="w-12 h-12 text-gray-400" />
                </div>
                <div className="p-6">
                  <div className="text-sm text-blue-600 font-medium mb-2">
                    {thesis.discipline}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors duration-200">
                    {thesis.title}
                  </h3>
                  <div className="text-sm text-gray-600 space-y-1 mb-4">
                    <div>Par {thesis.author}</div>
                    <div>{thesis.institution}</div>
                    <div>{thesis.year}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {thesis.downloads} téléchargements
                    </span>
                    <Link
                      to={`/thesis/${thesis.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors duration-200"
                    >
                      Voir plus →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              to="/search"
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200"
            >
              <span>Voir toutes les thèses</span>
              <Search className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Pourquoi choisir theses.ma ?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Une plateforme moderne conçue pour faciliter la recherche académique
              et promouvoir la collaboration scientifique.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg mb-6 group-hover:from-blue-200 group-hover:to-blue-300 transition-all duration-200">
                <Search className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Recherche Avancée
              </h3>
              <p className="text-gray-600">
                Filtres intelligents, suggestions automatiques et recherche vocale 
                pour trouver exactement ce que vous cherchez.
              </p>
            </div>

            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-100 to-teal-200 rounded-lg mb-6 group-hover:from-teal-200 group-hover:to-teal-300 transition-all duration-200">
                <Globe className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Accès Libre
              </h3>
              <p className="text-gray-600">
                Accédez gratuitement aux thèses en texte intégral avec des outils 
                de citation et d'annotation intégrés.
              </p>
            </div>

            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg mb-6 group-hover:from-amber-200 group-hover:to-amber-300 transition-all duration-200">
                <Shield className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Sécurisé & Fiable
              </h3>
              <p className="text-gray-600">
                Plateforme sécurisée avec validation institutionnelle et 
                archivage pérenne des travaux de recherche.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}