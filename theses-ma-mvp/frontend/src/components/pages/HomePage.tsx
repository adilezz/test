import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  BookOpen, 
  Users, 
  Database, 
  Award,
  TrendingUp,
  Globe,
  Shield,
  ArrowRight,
  Star
} from 'lucide-react';
import SearchBar from '../ui/SearchBar';
import ThesisCard from '../ui/ThesisCard';
import { thesesService } from '../../services/theses';
import { Thesis } from '../../types';

export default function HomePage() {
  const [featuredTheses, setFeaturedTheses] = useState<Thesis[]>([]);
  const [popularTheses, setPopularTheses] = useState<Thesis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const [featured, popular] = await Promise.all([
          thesesService.getFeaturedTheses(),
          thesesService.getPopularTheses()
        ]);
        setFeaturedTheses(featured);
        setPopularTheses(popular);
      } catch (error) {
        console.error('Error loading home data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHomeData();
  }, []);

  const stats = [
    { label: 'Thèses disponibles', value: '12,847', icon: BookOpen },
    { label: 'Universités partenaires', value: '47', icon: Users },
    { label: 'Disciplines couvertes', value: '156', icon: Database },
    { label: 'Téléchargements', value: '89,342', icon: TrendingUp }
  ];

  const features = [
    {
      icon: Search,
      title: 'Recherche Avancée',
      description: 'Filtres intelligents, suggestions automatiques et recherche vocale pour trouver exactement ce que vous cherchez.',
      color: 'from-blue-100 to-blue-200',
      iconColor: 'text-blue-600'
    },
    {
      icon: Globe,
      title: 'Accès Libre',
      description: 'Accédez gratuitement aux thèses en texte intégral avec des outils de citation et d\'annotation intégrés.',
      color: 'from-teal-100 to-teal-200',
      iconColor: 'text-teal-600'
    },
    {
      icon: Shield,
      title: 'Sécurisé & Fiable',
      description: 'Plateforme sécurisée avec validation institutionnelle et archivage pérenne des travaux de recherche.',
      color: 'from-amber-100 to-amber-200',
      iconColor: 'text-amber-600'
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

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse">
                  <div className="aspect-[3/4] bg-gray-200"></div>
                  <div className="p-6 space-y-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {featuredTheses.map((thesis) => (
                <ThesisCard key={thesis.id} thesis={thesis} />
              ))}
            </div>
          )}

          <div className="text-center">
            <Link
              to="/search"
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200"
            >
              <span>Voir toutes les thèses</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Popular Theses */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Thèses populaires
              </h2>
              <p className="text-lg text-gray-600">
                Les plus téléchargées cette semaine
              </p>
            </div>
            <Link
              to="/search?sort=downloads"
              className="text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
            >
              <span>Voir plus</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-16 bg-gray-200 rounded"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {popularTheses.map((thesis, index) => (
                <div key={thesis.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-sm">#{index + 1}</span>
                      </div>
                    </div>
                    <div className="w-12 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded flex items-center justify-center">
                      <FileText className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/thesis/${thesis.id}`}
                        className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors duration-200 line-clamp-1"
                      >
                        {thesis.title}
                      </Link>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                        <span>{thesis.author}</span>
                        <span>•</span>
                        <span>{thesis.year}</span>
                        <span>•</span>
                        <span>{thesis.downloadCount.toLocaleString()} téléchargements</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 text-amber-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm font-medium">Populaire</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
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
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className="text-center group">
                  <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${feature.color} rounded-lg mb-6 group-hover:scale-110 transition-all duration-200`}>
                    <IconComponent className={`w-8 h-8 ${feature.iconColor}`} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-teal-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Prêt à contribuer à la recherche marocaine ?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Rejoignez notre communauté de chercheurs et partagez vos travaux 
            avec l'écosystème académique national.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center space-x-2 bg-white text-blue-600 px-6 py-3 rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Users className="w-5 h-5" />
              <span>Créer un compte</span>
            </Link>
            <Link
              to="/upload"
              className="inline-flex items-center space-x-2 bg-blue-800 text-white px-6 py-3 rounded-lg hover:bg-blue-900 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <BookOpen className="w-5 h-5" />
              <span>Déposer une thèse</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}