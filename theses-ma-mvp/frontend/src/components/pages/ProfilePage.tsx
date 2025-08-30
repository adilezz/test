import React, { useState, useEffect } from 'react';
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
  TrendingUp,
  Save,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { thesesService } from '../../services/theses';
import { Thesis } from '../../types';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [userTheses, setUserTheses] = useState<Thesis[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: user?.name || '',
    institution: user?.institution || '',
    faculty: '',
    orcid: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      if (user) {
        try {
          const theses = await thesesService.getUserTheses(user.id);
          setUserTheses(theses);
        } catch (error) {
          console.error('Error loading user theses:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadUserData();
  }, [user]);

  const userStats = {
    publishedTheses: userTheses.filter(t => t.status === 'published').length,
    totalViews: userTheses.reduce((sum, t) => sum + t.viewCount, 0),
    totalDownloads: userTheses.reduce((sum, t) => sum + t.downloadCount, 0),
    citations: userTheses.reduce((sum, t) => sum + t.citationCount, 0),
    hIndex: calculateHIndex(userTheses)
  };

  function calculateHIndex(theses: Thesis[]): number {
    const citations = theses.map(t => t.citationCount).sort((a, b) => b - a);
    let hIndex = 0;
    for (let i = 0; i < citations.length; i++) {
      if (citations[i] >= i + 1) {
        hIndex = i + 1;
      } else {
        break;
      }
    }
    return hIndex;
  }

  const handleSaveProfile = async () => {
    try {
      await updateProfile(editData);
      setIsEditing(false);
    } catch (error) {
      // Error handled in AuthContext
    }
  };

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: User },
    { id: 'theses', label: 'Mes thèses', icon: BookOpen },
    { id: 'stats', label: 'Statistiques', icon: TrendingUp },
    { id: 'settings', label: 'Paramètres', icon: Edit3 }
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-6">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <User className="w-12 h-12 text-white" />
            </div>
            
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                    className="text-2xl font-bold text-gray-900 bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={editData.institution}
                      onChange={(e) => setEditData(prev => ({ ...prev, institution: e.target.value }))}
                      className="text-sm text-gray-600 bg-gray-50 border border-gray-300 rounded px-3 py-2 focus:border-blue-500 outline-none"
                      placeholder="Institution"
                    />
                    <input
                      type="text"
                      value={editData.orcid}
                      onChange={(e) => setEditData(prev => ({ ...prev, orcid: e.target.value }))}
                      className="text-sm text-gray-600 bg-gray-50 border border-gray-300 rounded px-3 py-2 focus:border-blue-500 outline-none"
                      placeholder="ORCID (optionnel)"
                    />
                  </div>
                </div>
              ) : (
                <>
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
                      <span className="capitalize">
                        {user?.role === 'student' ? 'Étudiant' :
                         user?.role === 'researcher' ? 'Chercheur' :
                         user?.role === 'professor' ? 'Professeur' : 'Administrateur'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex space-x-3">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Modifier le profil
                </button>
              )}
            </div>
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

                {/* Recent Theses */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Thèses récentes</h3>
                  <div className="space-y-4">
                    {userTheses.slice(0, 3).map((thesis) => (
                      <div key={thesis.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                        <div className="w-12 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 line-clamp-1">{thesis.title}</h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                            <span>{thesis.year}</span>
                            <span>{thesis.viewCount} vues</span>
                            <span>{thesis.downloadCount} téléchargements</span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          thesis.status === 'published' ? 'bg-green-100 text-green-800' :
                          thesis.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {thesis.status === 'published' ? 'Publiée' :
                           thesis.status === 'pending' ? 'En attente' : 'Brouillon'}
                        </span>
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
                            <span>{thesis.viewCount} vues</span>
                            <span>{thesis.downloadCount} téléchargements</span>
                            <span>{thesis.citationCount} citations</span>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {thesis.discipline} • {thesis.institution}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            thesis.status === 'published' ? 'bg-green-100 text-green-800' :
                            thesis.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                            thesis.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {thesis.status === 'published' ? 'Publiée' :
                             thesis.status === 'pending' ? 'En attente' :
                             thesis.status === 'approved' ? 'Approuvée' : 'Rejetée'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {userTheses.length === 0 && (
                    <div className="text-center py-12">
                      <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Aucune thèse publiée
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Commencez par déposer votre première thèse
                      </p>
                      <Link
                        to="/upload"
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                      >
                        Déposer une thèse
                      </Link>
                    </div>
                  )}
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
                            <span className="text-sm text-gray-600">Moyenne citations/thèse</span>
                            <span className="font-medium">
                              {userStats.publishedTheses > 0 ? 
                                Math.round(userStats.citations / userStats.publishedTheses) : 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Visibilité</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Vues totales</span>
                            <span className="font-medium">{userStats.totalViews.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Téléchargements totaux</span>
                            <span className="font-medium">{userStats.totalDownloads.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Moyenne vues/thèse</span>
                            <span className="font-medium">
                              {userStats.publishedTheses > 0 ? 
                                Math.round(userStats.totalViews / userStats.publishedTheses) : 0}
                            </span>
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
      </div>
    </div>
  );
}