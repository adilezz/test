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
      color: 'bg-blue-500',
      category: 'institution'
    },
    {
      title: 'Facultés',
      description: 'Gérer les facultés et leurs départements',
      icon: <GraduationCap className="w-6 h-6" />,
      path: '/admin/faculties',
      color: 'bg-green-500',
      category: 'institution'
    },
    {
      title: 'Écoles',
      description: 'Gérer les écoles et leurs hiérarchies',
      icon: <BookOpen className="w-6 h-6" />,
      path: '/admin/schools',
      color: 'bg-primary-500',
      category: 'institution'
    },
    {
      title: 'Départements',
      description: 'Gérer les départements des facultés et écoles',
      icon: <Users className="w-6 h-6" />,
      path: '/admin/departments',
      color: 'bg-red-500',
      category: 'institution'
    },
    
    // Academic Management
    {
      title: 'Personnes Académiques',
      description: 'Gérer les auteurs, directeurs et membres du jury',
      icon: <Users className="w-6 h-6" />,
      path: '/admin/academic-persons',
      color: 'bg-orange-500',
      category: 'academic'
    },
    {
      title: 'Diplômes',
      description: 'Gérer les types de diplômes et niveaux',
      icon: <GraduationCap className="w-6 h-6" />,
      path: '/admin/degrees',
      color: 'bg-teal-500',
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
      color: 'bg-pink-500',
      category: 'content'
    },
    {
      title: 'Mots-clés',
      description: 'Gérer le vocabulaire contrôlé et les tags',
      icon: <Tags className="w-6 h-6" />,
      path: '/admin/keywords',
      color: 'bg-secondary-500',
      category: 'content'
    },
    
    // Reference Data
    {
      title: 'Langues',
      description: 'Gérer les langues disponibles',
      icon: <Languages className="w-6 h-6" />,
      path: '/admin/languages',
      color: 'bg-cyan-500',
      category: 'reference'
    },
    {
      title: 'Entités Géographiques',
      description: 'Gérer les localisations et régions',
      icon: <MapPin className="w-6 h-6" />,
      path: '/admin/geographic-entities',
      color: 'bg-emerald-500',
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
      color: 'border-blue-200 bg-blue-50'
    },
    {
      id: 'academic',
      title: 'Gestion Académique',
      description: 'Personnel académique et diplômes',
      color: 'border-orange-200 bg-orange-50'
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
      color: 'border-green-200 bg-green-50'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-primary-50/30">
      <AdminHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="h1 text-neutral-900 mb-4">Administration</h1>
          <p className="text-lg text-neutral-600 max-w-3xl">
            Gestion complète des données de référence et du contenu du système
          </p>
        </div>

        {/* Quick Stats */}
        <div className="mb-12 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card-elevated p-6 border-l-4 border-primary-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-neutral-600">Modules Actifs</p>
                <p className="text-3xl font-bold text-neutral-900">{adminModules.length}</p>
              </div>
              <Building2 className="w-10 h-10 text-primary-500" />
            </div>
          </div>
          
          <div className="card-elevated p-6 border-l-4 border-secondary-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-neutral-600">Structures</p>
                <p className="text-3xl font-bold text-neutral-900">{modulesByCategory.institution.length}</p>
              </div>
              <GraduationCap className="w-10 h-10 text-secondary-500" />
            </div>
          </div>
          
          <div className="card-elevated p-6 border-l-4 border-accent-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-neutral-600">Contenu</p>
                <p className="text-3xl font-bold text-neutral-900">{modulesByCategory.content.length}</p>
              </div>
              <FileText className="w-10 h-10 text-accent-500" />
            </div>
          </div>
          
          <div className="card-elevated p-6 border-l-4 border-mountain-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-neutral-600">Références</p>
                <p className="text-3xl font-bold text-neutral-900">{modulesByCategory.reference.length + modulesByCategory.academic.length}</p>
              </div>
              <Globe className="w-10 h-10 text-mountain-500" />
            </div>
          </div>
        </div>

        {/* Admin Modules by Category */}
        <div className="space-y-10">
          {categories.map((category) => (
            <div key={category.id} className={`rounded-2xl border-2 ${category.color} p-8 shadow-soft`}>
              <div className="mb-8">
                <h2 className="h3 text-neutral-900 mb-2">{category.title}</h2>
                <p className="text-neutral-600 text-base">{category.description}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modulesByCategory[category.id as keyof typeof modulesByCategory].map((module, index) => (
                  <Link
                    key={index}
                    to={module.path}
                    className="block card hover:card-moroccan transition-all duration-300 p-6 group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`p-4 rounded-xl ${module.color} text-white flex-shrink-0 shadow-soft group-hover:shadow-moroccan transition-all duration-300`}>
                          {module.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-serif font-semibold text-neutral-900 truncate group-hover:text-primary-600 transition-colors duration-300">{module.title}</h3>
                          <p className="text-sm text-neutral-600 mt-2 line-clamp-2 font-medium">{module.description}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-neutral-400 flex-shrink-0 ml-2 group-hover:text-primary-500 group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-12 card-elevated p-8">
          <h2 className="h4 text-neutral-900 mb-6">Actions Rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              to="/admin/theses/new"
              className="flex items-center space-x-4 p-6 card hover:card-moroccan transition-all duration-300 group"
            >
              <div className="p-3 bg-primary-100 text-primary-600 rounded-xl group-hover:bg-primary-200 transition-all duration-300">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-semibold text-neutral-900 group-hover:text-primary-600 transition-colors duration-300">Nouvelle Thèse</h3>
                <p className="text-sm text-neutral-600 font-medium">Ajouter une thèse au système</p>
              </div>
            </Link>
            
            <Link
              to="/admin/universities"
              className="flex items-center space-x-4 p-6 card hover:card-moroccan transition-all duration-300 group"
            >
              <div className="p-3 bg-secondary-100 text-secondary-600 rounded-xl group-hover:bg-secondary-200 transition-all duration-300">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-semibold text-neutral-900 group-hover:text-primary-600 transition-colors duration-300">Gérer Universités</h3>
                <p className="text-sm text-neutral-600 font-medium">Voir et gérer les universités</p>
              </div>
            </Link>
            
            <Link
              to="/admin/academic-persons"
              className="flex items-center space-x-4 p-6 card hover:card-moroccan transition-all duration-300 group"
            >
              <div className="p-3 bg-accent-100 text-accent-600 rounded-xl group-hover:bg-accent-200 transition-all duration-300">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-semibold text-neutral-900 group-hover:text-primary-600 transition-colors duration-300">Gérer Personnes</h3>
                <p className="text-sm text-neutral-600 font-medium">Voir et gérer les personnes académiques</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}