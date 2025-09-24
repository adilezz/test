import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter,
  BarChart3,
  TrendingUp,
  Users,
  Building2,
  BookOpen,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import AdminHeader from '../layout/AdminHeader';

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  estimatedTime: string;
  format: string[];
}

export default function AdminReportsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const reportTypes: ReportType[] = [
    {
      id: 'thesis-summary',
      title: 'Rapport des Thèses',
      description: 'Vue d\'ensemble complète de toutes les thèses avec statuts et métriques',
      icon: <FileText className="w-6 h-6" />,
      category: 'content',
      estimatedTime: '2-3 min',
      format: ['PDF', 'Excel', 'CSV']
    },
    {
      id: 'university-analytics',
      title: 'Analyse par Université',
      description: 'Statistiques détaillées par université et faculté',
      icon: <Building2 className="w-6 h-6" />,
      category: 'institutional',
      estimatedTime: '1-2 min',
      format: ['PDF', 'Excel']
    },
    {
      id: 'author-statistics',
      title: 'Statistiques des Auteurs',
      description: 'Analyse des contributions des auteurs et directeurs',
      icon: <Users className="w-6 h-6" />,
      category: 'people',
      estimatedTime: '1-2 min',
      format: ['PDF', 'Excel', 'CSV']
    },
    {
      id: 'category-analysis',
      title: 'Analyse des Catégories',
      description: 'Distribution des thèses par discipline et spécialité',
      icon: <BarChart3 className="w-6 h-6" />,
      category: 'content',
      estimatedTime: '1 min',
      format: ['PDF', 'Excel']
    },
    {
      id: 'temporal-trends',
      title: 'Tendances Temporelles',
      description: 'Évolution des soumissions et défenses dans le temps',
      icon: <TrendingUp className="w-6 h-6" />,
      category: 'analytics',
      estimatedTime: '2-3 min',
      format: ['PDF', 'Excel']
    },
    {
      id: 'system-activity',
      title: 'Activité du Système',
      description: 'Logs et métriques d\'utilisation de la plateforme',
      icon: <Clock className="w-6 h-6" />,
      category: 'system',
      estimatedTime: '1 min',
      format: ['PDF', 'CSV']
    },
    {
      id: 'quality-control',
      title: 'Contrôle Qualité',
      description: 'Rapport sur la validation et la révision des thèses',
      icon: <CheckCircle className="w-6 h-6" />,
      category: 'quality',
      estimatedTime: '1-2 min',
      format: ['PDF', 'Excel']
    },
    {
      id: 'error-analysis',
      title: 'Analyse des Erreurs',
      description: 'Problèmes détectés et actions correctives recommandées',
      icon: <AlertCircle className="w-6 h-6" />,
      category: 'system',
      estimatedTime: '1 min',
      format: ['PDF', 'CSV']
    }
  ];

  const categories = [
    { id: 'all', label: 'Tous les rapports' },
    { id: 'content', label: 'Contenu' },
    { id: 'institutional', label: 'Institutionnel' },
    { id: 'people', label: 'Personnel' },
    { id: 'analytics', label: 'Analyses' },
    { id: 'system', label: 'Système' },
    { id: 'quality', label: 'Qualité' }
  ];

  const filteredReports = selectedCategory === 'all' 
    ? reportTypes 
    : reportTypes.filter(report => report.category === selectedCategory);

  const handleGenerateReport = (reportId: string, format: string) => {
    // Placeholder for report generation
    console.log(`Generating report ${reportId} in ${format} format`);
    // In a real implementation, this would call an API endpoint
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Rapports</h1>
          <p className="text-gray-600 mt-2">
            Générez des rapports détaillés sur tous les aspects du système
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              {/* Category Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Date de début"
                />
                <span className="text-gray-500">à</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Date de fin"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => (
            <div key={report.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-red-50 text-red-600">
                  {report.icon}
                </div>
                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                  {report.estimatedTime}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {report.title}
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                {report.description}
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {report.format.map((format) => (
                  <span key={format} className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded">
                    {format}
                  </span>
                ))}
              </div>

              <div className="flex space-x-2">
                {report.format.map((format) => (
                  <button
                    key={format}
                    onClick={() => handleGenerateReport(report.id, format)}
                    className="flex items-center space-x-1 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 flex-1 justify-center"
                  >
                    <Download className="w-4 h-4" />
                    <span>{format}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions Rapides</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              <FileText className="w-6 h-6 text-gray-400" />
              <div className="text-left">
                <div className="font-medium text-gray-900">Rapport Mensuel</div>
                <div className="text-sm text-gray-500">Générer le rapport du mois en cours</div>
              </div>
            </button>
            
            <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              <BarChart3 className="w-6 h-6 text-gray-400" />
              <div className="text-left">
                <div className="font-medium text-gray-900">Dashboard Exécutif</div>
                <div className="text-sm text-gray-500">Vue d'ensemble pour la direction</div>
              </div>
            </button>
            
            <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              <TrendingUp className="w-6 h-6 text-gray-400" />
              <div className="text-left">
                <div className="font-medium text-gray-900">Analyse Annuelle</div>
                <div className="text-sm text-gray-500">Bilan complet de l'année</div>
              </div>
            </button>
          </div>
        </div>

        {/* Report History */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Historique des Rapports</h3>
          </div>
          <div className="p-6">
            <div className="text-center text-gray-500 py-8">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>Aucun rapport généré récemment</p>
              <p className="text-sm">Les rapports générés apparaîtront ici</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}