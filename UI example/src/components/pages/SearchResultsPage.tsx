import React, { useState, useEffect } from 'react';
import { Grid3X3, List, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { useSearch } from '../../contexts/SearchContext';
import FilterPanel from '../ui/FilterPanel';
import ThesisCard from '../ui/ThesisCard';
import SearchBar from '../ui/SearchBar';

const mockTheses = [
  {
    id: '1',
    title: 'L\'impact de l\'intelligence artificielle sur le diagnostic médical au Maroc',
    author: 'Dr. Fatima Zahra Benali',
    director: 'Pr. Mohammed Alami',
    institution: 'Université Mohammed Premier de Oujda',
    year: 2024,
    discipline: 'Médecine',
    abstract: 'Cette recherche examine l\'application de l\'IA dans le diagnostic médical, analysant son efficacité, ses défis éthiques et son potentiel d\'amélioration des soins de santé au Maroc...',
    availability: 'available' as const,
    downloadCount: 1234,
    viewCount: 5678,
    pages: 287,
    language: 'Français'
  },
  {
    id: '2',
    title: 'Développement durable et transition énergétique dans les villes marocaines',
    author: 'Dr. Youssef Alami',
    director: 'Pr. Aicha Benomar',
    institution: 'Université Hassan II de Casablanca',
    year: 2023,
    discipline: 'Économie',
    abstract: 'Analyse des politiques de développement durable et des stratégies de transition énergétique mises en place dans les principales villes du Maroc...',
    availability: 'preparing' as const,
    downloadCount: 987,
    viewCount: 3456,
    pages: 324,
    language: 'Français'
  },
  {
    id: '3',
    title: 'Préservation du patrimoine culturel amazigh à travers les technologies numériques',
    author: 'Dr. Aicha Idrissi',
    director: 'Pr. Hassan Ouali',
    institution: 'Université Ibn Tofail de Kénitra',
    year: 2023,
    discipline: 'Sciences Sociales',
    abstract: 'Étude sur l\'utilisation des technologies numériques pour documenter, préserver et transmettre le patrimoine culturel amazigh...',
    availability: 'available' as const,
    downloadCount: 756,
    viewCount: 2134,
    pages: 198,
    language: 'Français'
  },
  {
    id: '4',
    title: 'Innovations en agriculture biologique et sécurité alimentaire',
    author: 'Dr. Omar Senhaji',
    director: 'Pr. Nadia Skalli',
    institution: 'Université Cadi Ayyad de Marrakech',
    year: 2024,
    discipline: 'Agriculture',
    abstract: 'Recherche sur les pratiques agricoles biologiques innovantes et leur contribution à la sécurité alimentaire nationale...',
    availability: 'unavailable' as const,
    downloadCount: 543,
    viewCount: 1876,
    pages: 245,
    language: 'Français'
  }
];

export default function SearchResultsPage() {
  const { state, dispatch } = useSearch();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      dispatch({
        type: 'SET_RESULTS',
        payload: {
          results: mockTheses,
          total: mockTheses.length
        }
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [state.query, state.filters, sortBy, dispatch]);

  const sortOptions = [
    { value: 'relevance', label: 'Pertinence' },
    { value: 'date_desc', label: 'Plus récent' },
    { value: 'date_asc', label: 'Plus ancien' },
    { value: 'title', label: 'Titre A-Z' },
    { value: 'downloads', label: 'Téléchargements' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-2xl mx-auto">
            <SearchBar />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-80 flex-shrink-0">
            {/* Mobile Filter Toggle */}
            <div className="lg:hidden mb-4">
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="flex items-center justify-between w-full bg-white border border-gray-200 rounded-lg px-4 py-3"
              >
                <span className="flex items-center space-x-2">
                  <SlidersHorizontal className="w-5 h-5" />
                  <span>Filtres</span>
                </span>
                <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${showMobileFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>
            
            <div className={`${showMobileFilters ? 'block' : 'hidden'} lg:block`}>
              <FilterPanel />
            </div>
          </div>

          {/* Results */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {state.totalResults.toLocaleString()} résultats
                  </h2>
                  {state.query && (
                    <p className="text-sm text-gray-600">
                      pour "{state.query}"
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-4">
                  {/* Sort Dropdown */}
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => {
                        setSortBy(e.target.value);
                        dispatch({ type: 'SET_SORT', payload: e.target.value });
                      }}
                      className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {sortOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-md transition-all duration-200 ${
                        viewMode === 'grid' 
                          ? 'bg-white text-gray-900 shadow-sm' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-md transition-all duration-200 ${
                        viewMode === 'list' 
                          ? 'bg-white text-gray-900 shadow-sm' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {state.loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-lg overflow-hidden animate-pulse">
                    <div className="aspect-[3/4] bg-gray-200"></div>
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Results Grid/List */
              <div className={
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' 
                  : 'space-y-6'
              }>
                {state.results.map((thesis) => (
                  <ThesisCard 
                    key={thesis.id} 
                    thesis={thesis} 
                    layout={viewMode}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {!state.loading && state.results.length > 0 && (
              <div className="mt-12 flex justify-center">
                <div className="flex items-center space-x-2">
                  <button className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors duration-200">
                    Précédent
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                    1
                  </button>
                  <button className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200">
                    2
                  </button>
                  <button className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200">
                    3
                  </button>
                  <button className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors duration-200">
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}