import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Users,
  Building,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Eye,
  BarChart3,
  PieChart,
  ArrowUpRight,
  Calendar
} from 'lucide-react';
import { adminService } from '../../services/admin';
import { AdminStats } from '../../types';

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const adminStats = await adminService.getStats();
        setStats(adminStats);
      } catch (error) {
        console.error('Error loading admin stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Erreur de chargement
        </h3>
        <p className="text-gray-600">
          Impossible de charger les statistiques
        </p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Thèses',
      value: stats.totalTheses.toLocaleString(),
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      link: '/admin/theses'
    },
    {
      title: 'Utilisateurs',
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      link: '/admin/users'
    },
    {
      title: 'Institutions',
      value: stats.totalInstitutions.toLocaleString(),
      icon: Building,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      link: '/admin/institutions'
    },
    {
      title: 'En attente',
      value: stats.pendingTheses.toLocaleString(),
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      link: '/admin/theses?status=pending'
    }
  ];

  const activityCards = [
    {
      title: 'Uploads ce mois',
      value: stats.monthlyUploads.toLocaleString(),
      icon: TrendingUp,
      change: '+12%',
      changeType: 'positive'
    },
    {
      title: 'Téléchargements ce mois',
      value: stats.monthlyDownloads.toLocaleString(),
      icon: Download,
      change: '+8%',
      changeType: 'positive'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="mt-2 text-gray-600">
          Vue d'ensemble de la plateforme theses.ma
        </p>
      </div>

      {/* Quick Actions */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              {stats.pendingTheses} thèses en attente de validation
            </p>
            <p className="text-sm text-amber-700">
              Vérifiez et approuvez les nouvelles soumissions
            </p>
          </div>
          <Link
            to="/admin/theses?status=pending"
            className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors duration-200"
          >
            Voir les thèses
          </Link>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <Link
              key={stat.title}
              to={stat.link}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-all duration-200 group"
            >
              <div className="flex items-center">
                <div className={`p-2 ${stat.bgColor} rounded-lg`}>
                  <IconComponent className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div className="ml-4 flex-1">
                  <div className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600">{stat.title}</div>
                </div>
                <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors duration-200" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Activity and Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Activité mensuelle</h3>
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {activityCards.map((activity) => {
              const IconComponent = activity.icon;
              return (
                <div key={activity.title} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <IconComponent className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="font-medium text-gray-900">{activity.value}</div>
                      <div className="text-sm text-gray-600">{activity.title}</div>
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${
                    activity.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {activity.change}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Institutions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Institutions</h3>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {stats.topInstitutions.map((institution, index) => (
              <div key={institution.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    index === 0 ? 'bg-yellow-100 text-yellow-800' :
                    index === 1 ? 'bg-gray-100 text-gray-800' :
                    index === 2 ? 'bg-amber-100 text-amber-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {institution.name}
                  </span>
                </div>
                <span className="text-sm text-gray-600">{institution.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Disciplines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Disciplines</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {stats.topDisciplines.map((discipline, index) => (
              <div key={discipline.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900">
                    {discipline.name}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(discipline.count / stats.topDisciplines[0].count) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-8 text-right">{discipline.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Activité récente</h3>
          <div className="space-y-4">
            {[
              { action: 'Nouvelle thèse soumise', time: 'Il y a 5 minutes', type: 'upload', icon: BookOpen },
              { action: 'Utilisateur vérifié', time: 'Il y a 12 minutes', type: 'user', icon: CheckCircle },
              { action: 'Thèse approuvée', time: 'Il y a 1 heure', type: 'approval', icon: CheckCircle },
              { action: 'Nouveau compte créé', time: 'Il y a 2 heures', type: 'user', icon: Users }
            ].map((activity, index) => {
              const IconComponent = activity.icon;
              return (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    activity.type === 'upload' ? 'bg-blue-100' :
                    activity.type === 'approval' ? 'bg-green-100' :
                    'bg-purple-100'
                  }`}>
                    <IconComponent className={`w-4 h-4 ${
                      activity.type === 'upload' ? 'text-blue-600' :
                      activity.type === 'approval' ? 'text-green-600' :
                      'text-purple-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}