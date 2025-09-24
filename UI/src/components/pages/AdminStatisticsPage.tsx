import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  BookOpen, 
  Building2, 
  GraduationCap, 
  Tags,
  FileText,
  Languages,
  MapPin,
  Calendar,
  Download,
  RefreshCw
} from 'lucide-react';
import { apiService } from '../../services/api';
import { StatisticsResponse } from '../../types/api';
import AdminHeader from '../layout/AdminHeader';

export default function AdminStatisticsPage() {
  const [statistics, setStatistics] = useState<StatisticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const stats = await apiService.getStatistics();
      setStatistics(stats);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const statisticsCards = [
    {
      title: 'Thèses',
      value: statistics?.total_theses || 0,
      icon: <FileText className="w-8 h-8" />,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: 'Universités',
      value: statistics?.total_universities || 0,
      icon: <Building2 className="w-8 h-8" />,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      title: 'Facultés',
      value: statistics?.total_faculties || 0,
      icon: <GraduationCap className="w-8 h-8" />,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
    {
      title: 'Écoles',
      value: statistics?.total_schools || 0,
      icon: <BookOpen className="w-8 h-8" />,
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600'
    },
    {
      title: 'Auteurs',
      value: statistics?.total_authors || 0,
      icon: <Users className="w-8 h-8" />,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600'
    },
    {
      title: 'Catégories',
      value: statistics?.total_categories || 0,
      icon: <Tags className="w-8 h-8" />,
      color: 'bg-pink-500',
      bgColor: 'bg-pink-50',
      textColor: 'text-pink-600'
    },
    {
      title: 'Mots-clés',
      value: statistics?.total_keywords || 0,
      icon: <Tags className="w-8 h-8" />,
      color: 'bg-teal-500',
      bgColor: 'bg-teal-50',
      textColor: 'text-teal-600'
    },
    {
      title: 'Langues',
      value: statistics?.total_languages || 0,
      icon: <Languages className="w-8 h-8" />,
      color: 'bg-cyan-500',
      bgColor: 'bg-cyan-50',
      textColor: 'text-cyan-600'
    },
    {
      title: 'Entités Géographiques',
      value: statistics?.total_geographic_entities || 0,
      icon: <MapPin className="w-8 h-8" />,
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Statistiques</h1>
              <p className="text-gray-600 mt-2">
                Analyses détaillées et métriques du système
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Dernière mise à jour: {lastUpdated.toLocaleString('fr-FR')}
              </div>
              <button
                onClick={loadStatistics}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Actualiser</span>
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {statisticsCards.map((card, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {card.value.toLocaleString()}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${card.bgColor} ${card.textColor}`}>
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts and Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Popular Categories */}
          {statistics?.popular_categories && statistics.popular_categories.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Catégories Populaires</h3>
                <BarChart3 className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-4">
                {statistics.popular_categories.slice(0, 8).map((category: any, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {category.name_fr || category.name}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-pink-500 h-2 rounded-full" 
                          style={{ 
                            width: `${Math.min((category.thesis_count || category.count) / Math.max(...statistics.popular_categories.map((c: any) => c.thesis_count || c.count)) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="ml-4 text-sm font-semibold text-gray-900">
                      {(category.thesis_count || category.count).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Universities */}
          {statistics?.top_universities && statistics.top_universities.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Universités Actives</h3>
                <TrendingUp className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-4">
                {statistics.top_universities.slice(0, 8).map((university: any, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {university.name}
                        {university.acronym && (
                          <span className="text-gray-500 ml-2">({university.acronym})</span>
                        )}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ 
                            width: `${Math.min(university.count / Math.max(...statistics.top_universities.map((u: any) => u.count)) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="ml-4 text-sm font-semibold text-gray-900">
                      {university.count.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        {statistics?.recent_theses && statistics.recent_theses.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Thèses Récentes</h3>
                <Calendar className="w-5 h-5 text-gray-400" />
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {statistics.recent_theses.slice(0, 10).map((thesis: any, index) => (
                <div key={index} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 line-clamp-1">
                        {thesis.title_fr || thesis.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {thesis.author_name && `${thesis.author_name} • `}
                        {thesis.university_name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(thesis.created_at).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        thesis.status === 'published' 
                          ? 'bg-green-100 text-green-800'
                          : thesis.status === 'approved'
                          ? 'bg-blue-100 text-blue-800'
                          : thesis.status === 'under_review'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {thesis.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Export Section */}
        <div className="mt-8 flex justify-end">
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200">
            <Download className="w-4 h-4" />
            <span>Exporter les statistiques</span>
          </button>
        </div>
      </div>
    </div>
  );
}