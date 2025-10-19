import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  Sparkles,
  BarChart3,
  GraduationCap
} from 'lucide-react';
import { StatisticsResponse, ThesisResponse } from '../../types/api';
import apiService from '../../services/api';
import { useSearch } from '../../contexts/SearchContext';
import EnhancedThesisCard from '../ui/EnhancedThesisCard';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { setFilters } = useSearch();
  const [searchQuery, setSearchQuery] = useState('');
  const [statistics, setStatistics] = useState<StatisticsResponse | null>(null);
  const [featuredTheses, setFeaturedTheses] = useState<ThesisResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsResponse, thesesResponse] = await Promise.all([
          apiService.getStatistics(),
          apiService.getTheses({
            page: 1,
            limit: 6,
            sort_field: 'created_at' as any,
            sort_order: 'desc' as any
          })
        ]);

        setStatistics(statsResponse);
        setFeaturedTheses(thesesResponse.data);
      } catch (error) {
        console.error('Failed to load homepage data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setFilters({ q: searchQuery.trim() });
      navigate('/search');
    }
  };

  const handleQuickSearch = (query: string) => {
    setFilters({ q: query });
    navigate('/search');
  };

  const stats = [
    {
      label: 'Thèses disponibles',
      value: statistics?.total_theses?.toLocaleString() || '0',
      icon: BookOpen,
      color: 'from-primary-500 to-primary-600'
    },
    {
      label: 'Universités partenaires',
      value: statistics?.total_universities?.toLocaleString() || '0',
      icon: Users,
      color: 'from-secondary-500 to-secondary-600'
    },
    {
      label: 'Facultés',
      value: statistics?.total_faculties?.toLocaleString() || '0',
      icon: Database,
      color: 'from-navy-600 to-navy-700'
    },
    {
      label: 'Auteurs',
      value: statistics?.total_authors?.toLocaleString() || '0',
      icon: TrendingUp,
      color: 'from-accent-500 to-accent-600'
    }
  ];

  const quickSearches = [
    'Intelligence artificielle',
    'Développement durable',
    'Médecine',
    'Économie',
    'Sciences sociales',
    'Ingénierie'
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section with Moroccan Cultural Elements */}
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-accent-50 py-20 overflow-hidden">
        {/* Moroccan Pattern Background */}
        <div className="absolute inset-0 bg-moroccan-pattern opacity-40" />
        
        {/* Background Elements - Moroccan-inspired */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-100 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-pattern-float" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-100 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-pattern-float" style={{ animationDelay: '5s' }} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-secondary-50 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse-slow" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="text-center"
          >
            <motion.div variants={itemVariants} className="max-w-4xl mx-auto">
              <div className="flex items-center justify-center mb-6">
                <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-soft">
                  <Sparkles className="w-5 h-5 text-primary-600" />
                  <span className="text-sm font-medium text-primary-700">
                    Plateforme officielle du Maroc
                  </span>
                </div>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                Découvrez la recherche
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-secondary-600">
                  {' '}académique
                </span>
                <br />
                marocaine
              </h1>

              <p className="text-xl md:text-2xl text-gray-600 mb-10 leading-relaxed max-w-3xl mx-auto">
                La plateforme centralisée pour explorer, partager et citer les thèses
                des universités marocaines. Accédez à {statistics?.total_theses?.toLocaleString() || 'des milliers de'} travaux de recherche.
              </p>

              {/* Search Bar */}
              <motion.form
                variants={itemVariants}
                onSubmit={handleSearch}
                className="max-w-3xl mx-auto mb-8"
              >
                <div className="relative">
                  <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher par titre, auteur, mots-clés, université..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-16 pr-6 py-6 text-lg border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-soft bg-white/90 backdrop-blur-sm"
                  />
                  <button
                    type="submit"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 btn-primary px-8 py-3"
                  >
                    Rechercher
                  </button>
                </div>
              </motion.form>

              {/* Quick Searches */}
              <motion.div variants={itemVariants} className="mb-10">
                <p className="text-sm text-gray-500 mb-4">Recherches populaires:</p>
                <div className="flex flex-wrap justify-center gap-3">
                  {quickSearches.map((query) => (
                    <button
                      key={query}
                      onClick={() => handleQuickSearch(query)}
                      className="px-4 py-2 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 transition-all duration-200 shadow-soft"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* CTA Buttons */}
              <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-4">
                <Link
                  to="/search"
                  className="inline-flex items-center space-x-2 bg-primary-600 text-white px-8 py-4 rounded-xl hover:bg-primary-700 transition-all duration-200 shadow-medium hover:shadow-strong group"
                >
                  <Search className="w-5 h-5" />
                  <span className="font-medium">Explorer les thèses</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </Link>
                <Link
                  to="/universities"
                  className="inline-flex items-center space-x-2 bg-white text-gray-700 px-8 py-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all duration-200 shadow-soft hover:shadow-medium group"
                >
                  <Users className="w-5 h-5" />
                  <span className="font-medium">Parcourir par université</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className="text-center group"
                >
                  <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${stat.color} rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-200 shadow-medium`}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                    {isLoading ? (
                      <div className="skeleton h-8 w-16 mx-auto rounded" />
                    ) : (
                      stat.value
                    )}
                  </div>
                  <div className="text-sm font-medium text-gray-600">
                    {stat.label}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Featured Theses */}
      {featuredTheses.length > 0 && (
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={containerVariants}
            >
              <motion.div variants={itemVariants} className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-900 mb-6">
                  Thèses récemment ajoutées
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Découvrez les dernières recherches publiées par nos universités partenaires
                </p>
              </motion.div>

              <motion.div
                variants={containerVariants}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12"
              >
                {featuredTheses.map((thesis) => (
                  <motion.div key={thesis.id} variants={itemVariants}>
                    <EnhancedThesisCard
                      thesis={thesis}
                      onView={(thesis) => navigate(`/thesis/${thesis.id}`)}
                      showActions={false}
                    />
                  </motion.div>
                ))}
              </motion.div>

              <motion.div variants={itemVariants} className="text-center">
                <Link
                  to="/search"
                  className="inline-flex items-center space-x-2 bg-primary-600 text-white px-8 py-4 rounded-xl hover:bg-primary-700 transition-all duration-200 shadow-medium hover:shadow-strong group"
                >
                  <span className="font-medium">Voir toutes les thèses</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
          >
            <motion.div variants={itemVariants} className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Pourquoi choisir theses.ma ?
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Une plateforme moderne conçue pour faciliter la recherche académique
                et promouvoir la collaboration scientifique au Maroc
              </p>
            </motion.div>

            <motion.div
              variants={containerVariants}
              className="grid grid-cols-1 md:grid-cols-3 gap-12"
            >
              <motion.div variants={itemVariants} className="text-center group">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl mb-8 group-hover:from-primary-200 group-hover:to-primary-300 transition-all duration-200 shadow-soft group-hover:shadow-medium">
                  <Search className="w-10 h-10 text-primary-600" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                  Recherche Avancée
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Filtres intelligents par université, faculté, domaine et période.
                  Recherche en texte intégral avec suggestions automatiques.
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className="text-center group">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-secondary-100 to-secondary-200 rounded-2xl mb-8 group-hover:from-secondary-200 group-hover:to-secondary-300 transition-all duration-200 shadow-soft group-hover:shadow-medium">
                  <Globe className="w-10 h-10 text-secondary-600" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                  Accès Libre
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Accédez gratuitement aux thèses en texte intégral avec des outils
                  de citation et d'export dans différents formats.
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className="text-center group">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-accent-100 to-accent-200 rounded-2xl mb-8 group-hover:from-accent-200 group-hover:to-accent-300 transition-all duration-200 shadow-soft group-hover:shadow-medium">
                  <Shield className="w-10 h-10 text-accent-600" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                  Sécurisé & Fiable
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Plateforme sécurisée avec validation institutionnelle et
                  archivage pérenne des travaux de recherche.
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Popular Categories */}
      {statistics?.popular_categories && statistics.popular_categories.length > 0 && (
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={containerVariants}
            >
              <motion.div variants={itemVariants} className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-900 mb-6">
                  Domaines de recherche populaires
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Explorez les domaines les plus actifs de la recherche marocaine
                </p>
              </motion.div>

              <motion.div
                variants={containerVariants}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
              >
                {statistics.popular_categories.slice(0, 8).map((category: any, index) => (
                  <motion.button
                    key={index}
                    variants={itemVariants}
                    onClick={() => handleQuickSearch(category.name)}
                    className="p-6 bg-white rounded-xl border border-gray-200 hover:border-primary-200 hover:bg-primary-50 transition-all duration-200 shadow-soft hover:shadow-medium group text-left"
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center group-hover:from-primary-200 group-hover:to-primary-300 transition-all duration-200">
                        <GraduationCap className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors duration-200">
                          {category.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {category.count} thèses
                        </p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>
      )}
    </div>
  );
};

export default HomePage;