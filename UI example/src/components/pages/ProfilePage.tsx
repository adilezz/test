import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Building, 
  Calendar, 
  BookOpen, 
  Download, 
  Eye,
  Edit3,
  Award,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const userStats = {
    publishedTheses: 3,
    totalViews: 12547,
    totalDownloads: 8934,
    citations: 89,
    hIndex: 7
  };

  const userTheses = [
    {
      id: '1',
      title: 'L\'impact de l\'intelligence artificielle sur le diagnostic médical',
      year: 2024,
      views: 5678,
      downloads: 1234,
      citations: 12,
      status: 'published'
    },
    {
      id: '2',
      title: 'Algorithmes d\'apprentissage pour l\'analyse d\'images médicales',
      year: 2023,
      views: 3456,
      downloads: 987,
      citations: 8,
      status: 'published'
    },
    {
      id: '3',
      title: 'Éthique et responsabilité en IA médicale',
      year: 2023,
      views: 3413,
      downloads: 6713,
      citations: 69,
      status: 'under_review'
    }
  ];

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: User },
    { id: 'theses', label: 'Mes thèses', icon: BookOpen },
    { id: 'stats', label: 'Statistiques', icon: TrendingUp },
    { id: 'settings', label: 'Paramètres', icon: Edit3 }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-6">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <User className="w-12 h-12 text-white" />
            </div>
            
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{user?.name}</h1>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>{user?.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Building className="w-4 h-4" />
                  <span>{user?.institution}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Award className="w-4 h-4" />
                  <span className="capitalize">{user?.role}</span>
                </div>
              </div>
            </div>

            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200">
              Modifier le profil
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="space-y-1">
                {tabs.map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors duration-200 ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { label: 'Thèses publiées', value: userStats.publishedTheses, icon: BookOpen },
                    { label: 'Vues totales', value: userStats.totalViews.toLocaleString(), icon: Eye },
                    { label: 'Téléchargements', value: userStats.totalDownloads.toLocaleString(), icon: Download },
                    { label: 'Citations', value: userStats.citations, icon: Award },
                    { label: 'Index H', value: userStats.hIndex, icon: TrendingUp }
                  ].map((stat, index) => {
                    const IconComponent = stat.icon;
                    return (
                      <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                        <IconComponent className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                        <div className="text-lg font-bold text-gray-900">{stat.value}</div>
                        <div className="text-xs text-gray-600">{stat.label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Activité récente</h3>
                  <div className="space-y-4">
                    {[
                      { action: 'Nouvelle citation de votre thèse', time: 'Il y a 2 heures', type: 'citation' },
                      { action: 'Thèse téléchargée 15 fois', time: 'Il y a 1 jour', type: 'download' },
                      { action: 'Profil consulté par 8 personnes', time: 'Il y a 3 jours', type: 'view' }
                    ].map((activity, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                          <p className="text-xs text-gray-500">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'theses' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Mes thèses</h3>
                  <Link
                    to="/upload"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                  >
                    Ajouter une thèse
                  </Link>
                </div>

                <div className="space-y-4">
                  {userTheses.map((thesis) => (
                    <div key={thesis.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-2">{thesis.title}</h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>{thesis.year}</span>
                            <span>{thesis.views} vues</span>
                            <span>{thesis.downloads} téléchargements</span>
                            <span>{thesis.citations} citations</span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          thesis.status === 'published' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {thesis.status === 'published' ? 'Publiée' : 'En révision'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiques détaillées</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Impact académique</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Citations totales</span>
                            <span className="font-medium">{userStats.citations}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Index H</span>
                            <span className="font-medium">{userStats.hIndex}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Index i10</span>
                            <span className="font-medium">5</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Visibilité</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Vues ce mois</span>
                            <span className="font-medium">1,234</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Téléchargements ce mois</span>
                            <span className="font-medium">567</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Profil consulté</span>
                            <span className="font-medium">89 fois</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Paramètres du compte</h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Notifications par email</h4>
                    <div className="space-y-3">
                      {[
                        { label: 'Nouvelles citations de mes thèses', checked: true },
                        { label: 'Commentaires sur mes publications', checked: true },
                        { label: 'Nouveautés de la plateforme', checked: false },
                        { label: 'Suggestions de thèses similaires', checked: true }
                      ].map((setting, index) => (
                        <label key={index} className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            defaultChecked={setting.checked}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{setting.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Confidentialité</h4>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          defaultChecked={true}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Profil public visible</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          defaultChecked={false}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Autoriser l'indexation par les moteurs de recherche</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200">
                      Sauvegarder les modifications
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <nav className="flex space-x-8 px-6 overflow-x-auto">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 border-b-2 whitespace-nowrap transition-colors duration-200 ${
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
      </div>
    </div>
  );
}