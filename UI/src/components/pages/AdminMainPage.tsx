import React from 'react';
import { 
  Building2, 
  GraduationCap, 
  Users, 
  BookOpen, 
  Tags, 
  Globe,
  Languages,
  MapPin,
  FileText,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminHeader from '../layout/AdminHeader';

interface AdminModule {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
  category: 'institution' | 'academic' | 'content' | 'reference';
}

export default function AdminMainPage() {
  const adminModules: AdminModule[] = [
    // Institution Management
    {
      title: 'Universités',
      description: 'Gérer les universités et leurs structures',
      icon: <Building2 className="w-6 h-6" />,
      path: '/admin/universities',
      color: 'bg-navy-600',
      category: 'institution'
    },
    {
      title: 'Facultés',
      description: 'Gérer les facultés et leurs départements',
      icon: <GraduationCap className="w-6 h-6" />,
      path: '/admin/faculties',
      color: 'bg-primary-600',
      category: 'institution'
    },
    {
      title: 'Écoles',
      description: 'Gérer les écoles et leurs hiérarchies',
      icon: <BookOpen className="w-6 h-6" />,
      path: '/admin/schools',
      color: 'bg-navy-600',
      category: 'institution'
    },
    {
      title: 'Départements',
      description: 'Gérer les départements des facultés et écoles',
      icon: <Users className="w-6 h-6" />,
      path: '/admin/departments',
      color: 'bg-error-600',
      category: 'institution'
    },
    
    // Academic Management
    {
      title: 'Personnes Académiques',
      description: 'Gérer les auteurs, directeurs et membres du jury',
      icon: <Users className="w-6 h-6" />,
      path: '/admin/academic-persons',
      color: 'bg-secondary-600',
      category: 'academic'
    },
    {
      title: 'Diplômes',
      description: 'Gérer les types de diplômes et niveaux',
      icon: <GraduationCap className="w-6 h-6" />,
      path: '/admin/degrees',
      color: 'bg-accent-600',
      category: 'academic'
    },
    
    // Content Management
    {
      title: 'Thèses',
      description: 'Gérer les thèses et leur contenu',
      icon: <FileText className="w-6 h-6" />,
      path: '/admin/theses',
      color: 'bg-primary-600',
      category: 'content'
    },
    {
      title: 'Catégories',
      description: 'Gérer les disciplines et spécialités',
      icon: <Tags className="w-6 h-6" />,
      path: '/admin/categories',
      color: 'bg-secondary-500',
      category: 'content'
    },
    {
      title: 'Mots-clés',
      description: 'Gérer le vocabulaire contrôlé et les tags',
      icon: <Tags className="w-6 h-6" />,
      path: '/admin/keywords',
      color: 'bg-navy-500',
      category: 'content'
    },
    
    // Reference Data
    {
      title: 'Langues',
      description: 'Gérer les langues disponibles',
      icon: <Languages className="w-6 h-6" />,
      path: '/admin/languages',
      color: 'bg-info-500',
      category: 'reference'
    },
    {
      title: 'Entités Géographiques',
      description: 'Gérer les localisations et régions',
      icon: <MapPin className="w-6 h-6" />,
      path: '/admin/geographic-entities',
      color: 'bg-success-500',
      category: 'reference'
    }
  ];

  const modulesByCategory = {
    institution: adminModules.filter(m => m.category === 'institution'),
    academic: adminModules.filter(m => m.category === 'academic'),
    content: adminModules.filter(m => m.category === 'content'),
    reference: adminModules.filter(m => m.category === 'reference')
  };

  const categories = [
    {
      id: 'institution',
      title: 'Gestion Institutionnelle',
      description: 'Structures universitaires et organisationnelles',
      color: 'border-navy-200 bg-navy-50'
    },
    {
      id: 'academic',
      title: 'Gestion Académique',
      description: 'Personnel académique et diplômes',
      color: 'border-secondary-200 bg-secondary-50'
    },
    {
      id: 'content',
      title: 'Gestion du Contenu',
      description: 'Thèses, catégories et classification',
      color: 'border-primary-200 bg-primary-50'
    },
    {
      id: 'reference',
      title: 'Données de Référence',
      description: 'Langues, géographie et métadonnées',
      color: 'border-success-200 bg-success-50'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Administration</h1>
          <p className="text-gray-600 mt-2">
            Gestion complète des données de référence et du contenu du système
          </p>
        </div>

        {/* Quick Stats */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-navy-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Modules Actifs</p>
                <p className="text-2xl font-bold text-gray-900">{adminModules.length}</p>
              </div>
              <Building2 className="w-8 h-8 text-navy-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-primary-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Structures</p>
                <p className="text-2xl font-bold text-gray-900">{modulesByCategory.institution.length}</p>
              </div>
              <GraduationCap className="w-8 h-8 text-primary-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-primary-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Contenu</p>
                <p className="text-2xl font-bold text-gray-900">{modulesByCategory.content.length}</p>
              </div>
              <FileText className="w-8 h-8 text-primary-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-secondary-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Références</p>
                <p className="text-2xl font-bold text-gray-900">{modulesByCategory.reference.length + modulesByCategory.academic.length}</p>
              </div>
              <Globe className="w-8 h-8 text-secondary-500" />
            </div>
          </div>
        </div>

        {/* Admin Modules by Category */}
        <div className="space-y-8">
          {categories.map((category) => (
            <div key={category.id} className={`rounded-lg border-2 ${category.color} p-6`}>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">{category.title}</h2>
                <p className="text-gray-600 text-sm mt-1">{category.description}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {modulesByCategory[category.id as keyof typeof modulesByCategory].map((module, index) => (
                  <Link
                    key={index}
                    to={module.path}
                    className="block bg-white rounded-lg shadow hover:shadow-md transition-all duration-200 p-4 border border-gray-200 hover:border-gray-300"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-3 rounded-lg ${module.color} text-white flex-shrink-0`}>
                          {module.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 truncate">{module.title}</h3>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{module.description}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions Rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/admin/theses/new"
              className="flex items-center space-x-3 p-4 border border-gray-200 rounded-moroccan hover:border-primary-300 hover:bg-primary-50 transition-all duration-200"
            >
              <div className="p-2 bg-primary-100 text-primary-700 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Nouvelle Thèse</h3>
                <p className="text-sm text-gray-600">Ajouter une thèse au système</p>
              </div>
            </Link>
            
            <Link
              to="/admin/universities"
              className="flex items-center space-x-3 p-4 border border-gray-200 rounded-moroccan hover:border-success-300 hover:bg-success-50 transition-all duration-200"
            >
              <div className="p-2 bg-success-100 text-success-700 rounded-lg">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Gérer Universités</h3>
                <p className="text-sm text-gray-600">Voir et gérer les universités</p>
              </div>
            </Link>
            
            <Link
              to="/admin/academic-persons"
              className="flex items-center space-x-3 p-4 border border-gray-200 rounded-moroccan hover:border-secondary-300 hover:bg-secondary-50 transition-all duration-200"
            >
              <div className="p-2 bg-secondary-100 text-secondary-700 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Gérer Personnes</h3>
                <p className="text-sm text-gray-600">Voir et gérer les personnes académiques</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}