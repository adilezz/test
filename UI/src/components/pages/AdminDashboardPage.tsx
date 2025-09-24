import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BookOpen, 
  Building2, 
  GraduationCap, 
  Tags, 
  Globe,
  ChevronRight,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Settings,
  BarChart3,
  TrendingUp,
  Calendar,
  FileText,
  Languages,
  MapPin
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiService } from '../../services/api';
import { StatisticsResponse } from '../../types/api';
import AdminHeader from '../layout/AdminHeader';

interface AdminCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  count?: number;
  path: string;
  color: string;
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

export default function AdminDashboardPage() {
  const [statistics, setStatistics] = useState<StatisticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      const stats = await apiService.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const adminCards: AdminCard[] = [
    {
      title: 'Universités',
      description: 'Gérer les universités et leurs structures',
      icon: <Building2 className="w-6 h-6" />,
      count: statistics?.total_universities,
      path: '/admin/universities',
      color: 'bg-blue-500'
    },
    {
      title: 'Facultés',
      description: 'Gérer les facultés et départements',
      icon: <GraduationCap className="w-6 h-6" />,
      count: statistics?.total_faculties,
      path: '/admin/faculties',
      color: 'bg-green-500'
    },
    {
      title: 'Écoles',
      description: 'Gérer les écoles et leurs hiérarchies',
      icon: <BookOpen className="w-6 h-6" />,
      count: statistics?.total_schools,
      path: '/admin/schools',
      color: 'bg-purple-500'
    },
    {
      title: 'Personnes Académiques',
      description: 'Gérer les auteurs, directeurs et jury',
      icon: <Users className="w-6 h-6" />,
      count: statistics?.total_authors,
      path: '/admin/academic-persons',
      color: 'bg-orange-500'
    },
    {
      title: 'Catégories',
      description: 'Gérer les disciplines et spécialités',
      icon: <Tags className="w-6 h-6" />,
      count: statistics?.total_categories,
      path: '/admin/categories',
      color: 'bg-pink-500'
    },
    {
      title: 'Mots-clés',
      description: 'Gérer le vocabulaire contrôlé',
      icon: <Tags className="w-6 h-6" />,
      count: statistics?.total_keywords,
      path: '/admin/keywords',
      color: 'bg-indigo-500'
    },
    {
      title: 'Diplômes',
      description: 'Gérer les types de diplômes',
      icon: <GraduationCap className="w-6 h-6" />,
      count: statistics?.total_degrees,
      path: '/admin/degrees',
      color: 'bg-teal-500'
    },
    {
      title: 'Langues',
      description: 'Gérer les langues disponibles',
      icon: <Languages className="w-6 h-6" />,
      count: statistics?.total_languages,
      path: '/admin/languages',
      color: 'bg-cyan-500'
    },
    {
      title: 'Entités Géographiques',
      description: 'Gérer les localisations',
      icon: <MapPin className="w-6 h-6" />,
      count: statistics?.total_geographic_entities,
      path: '/admin/geographic-entities',
      color: 'bg-emerald-500'
    }
  ];

  const quickActions: QuickAction[] = [
    {
      title: 'Nouvelle Thèse',
      description: 'Ajouter une nouvelle thèse au système',
      icon: <Plus className="w-5 h-5" />,
      path: '/admin/theses/new',
      color: 'bg-blue-600'
    },
    {
      title: 'Import en Lot',
      description: 'Importer plusieurs thèses simultanément',
      icon: <FileText className="w-5 h-5" />,
      path: '/admin/theses/bulk-import',
      color: 'bg-green-600'
    },
    {
      title: 'Nouvelle Université',
      description: 'Ajouter une université au système',
      icon: <Building2 className="w-5 h-5" />,
      path: '/admin/universities/new',
      color: 'bg-purple-600'
    },
    {
      title: 'Nouvelle Personne',
      description: 'Ajouter une personne académique',
      icon: <Users className="w-5 h-5" />,
      path: '/admin/academic-persons/new',
      color: 'bg-orange-600'
    }
  ];

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
          <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord</h1>
          <p className="text-gray-600 mt-2">
            Vue d'ensemble du système et gestion des données de référence
          </p>
        </div>

        {/* Statistics Overview */}
        {statistics && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Vue d'ensemble</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Thèses</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {statistics.total_theses.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-green-100 text-green-600">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Universités</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {statistics.total_universities.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Facultés</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {statistics.total_faculties.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Auteurs</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {statistics.total_authors.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Écoles</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {statistics.total_schools.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-pink-100 text-pink-600">
                    <Tags className="w-6 h-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Catégories</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {statistics.total_categories.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-teal-100 text-teal-600">
                    <Tags className="w-6 h-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Mots-clés</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {statistics.total_keywords.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-cyan-100 text-cyan-600">
                    <Languages className="w-6 h-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Langues</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {statistics.total_languages.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions Rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                to={action.path}
                className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${action.color} text-white`}>
                    {action.icon}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{action.title}</h3>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Admin Modules */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Modules d'Administration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminCards.map((card, index) => (
              <Link
                key={index}
                to={card.path}
                className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-lg ${card.color} text-white`}>
                      {card.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{card.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{card.description}</p>
                      {card.count !== undefined && (
                        <p className="text-lg font-semibold text-blue-600 mt-2">
                          {card.count.toLocaleString()} éléments
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        {statistics?.recent_theses && statistics.recent_theses.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Thèses Récentes</h2>
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Dernières soumissions</h3>
                  <Link to="/admin/theses" className="text-blue-600 hover:text-blue-800 text-sm">
                    Voir toutes
                  </Link>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {statistics.recent_theses.slice(0, 5).map((thesis: any, index) => (
                  <div key={index} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 line-clamp-1">
                          {thesis.title_fr || thesis.title}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {thesis.author_name} • {thesis.university_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(thesis.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          thesis.status === 'published' 
                            ? 'bg-green-100 text-green-800'
                            : thesis.status === 'under_review'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {thesis.status}
                        </span>
                        <Link
                          to={`/admin/theses/${thesis.id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Popular Categories */}
        {statistics?.popular_categories && statistics.popular_categories.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Catégories Populaires</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {statistics.popular_categories.slice(0, 6).map((category: any, index) => (
                <div key={index} className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{category.name_fr}</h4>
                      <p className="text-sm text-gray-600">
                        {category.thesis_count} thèses
                      </p>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {category.thesis_count}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}