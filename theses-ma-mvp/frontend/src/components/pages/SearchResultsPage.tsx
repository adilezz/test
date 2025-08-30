import React, { useState, useEffect } from 'react';
import { Grid3X3, List, SlidersHorizontal, ChevronDown, Filter } from 'lucide-react';
import { useSearch } from '../../contexts/SearchContext';
import { thesesService } from '../../services/theses';
import FilterPanel from '../ui/FilterPanel';
import ThesisCard from '../ui/ThesisCard';
import SearchBar from '../ui/SearchBar';

export default function SearchResultsPage() {
  const { state, dispatch } = useSearch();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    const performSearch = async () => {
      if (state.loading) {
        try {
          const searchParams = {
            query: state.query,
            filters: state.filters,
            page: state.currentPage,
            pageSize: state.pageSize,
            sortBy: state.sortBy
          };

          const result = await thesesService.search(searchParams);
          
          dispatch({
            type: 'SET_RESULTS',
            payload: {
              results: result.results,
              total: result.total
            }
          });
        } catch (error) {
          console.error('Search error:', error);
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      }
    };

    performSearch();
  }, [state.query, state.filters, state.currentPage, state.sortBy, state.loading, dispatch]);

  const sortOptions = [
    { value: 'relevance', label: 'Pertinence' },
    { value: 'date_desc', label: 'Plus récent' },
    { value: 'date_asc', label: 'Plus ancien' },
    { value: 'title', label: 'Titre A-Z' },
    { value: 'downloads', label: 'Téléchargements' },
    { value: 'views', label: 'Consultations' }
  ];

  const handleSortChange = (sortValue: string) => {
    dispatch({ type: 'SET_SORT', payload: sortValue });
    dispatch({ type: 'SET_LOADING', payload: true });
  };

  const handlePageChange = (page: number) => {
    dispatch({ type: 'SET_PAGE', payload: page });
    dispatch({ type: 'SET_LOADING', payload: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = Math.ceil(state.totalResults / state.pageSize);
  const hasActiveFilters = Object.values(state.filters).some(filter => 
    Array.isArray(filter) ? filter.length > 0 : Boolean(filter)
  );

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
                  {hasActiveFilters && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                      Actifs
                    </span>
                  )}
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
                    {state.loading ? 'Recherche en cours...' : `${state.totalResults.toLocaleString()} résultats`}
                  </h2>
                  {state.query && (
                    <p className="text-sm text-gray-600">
                      pour "{state.query}"
                    </p>
                  )}
                  {hasActiveFilters && (
                    <div className="flex items-center space-x-2 mt-2">
                      <Filter className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-blue-600">Filtres appliqués</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-4">
                  {/* Sort Dropdown */}
                  <div className="relative">
                    <select
                      value={state.sortBy}
                      onChange={(e) => handleSortChange(e.target.value)}
                      className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {sortOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          Trier par: {option.label}
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
                      title="Vue en grille"
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
                      title="Vue en liste"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {state.loading ? (
              <div className={
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' 
                  : 'space-y-6'
              }>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className={`bg-white border border-gray-200 rounded-lg overflow-hidden animate-pulse ${
                    viewMode === 'list' ? 'p-6' : ''
                  }`}>
                    {viewMode === 'grid' ? (
                      <>
                        <div className="aspect-[3/4] bg-gray-200"></div>
                        <div className="p-4 space-y-3">
                          <div className="h-4 bg-gray-200 rounded"></div>
                          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </>
                    ) : (
                      <div className="flex space-x-4">
                        <div className="w-16 h-20 bg-gray-200 rounded"></div>
                        <div className="flex-1 space-y-3">
                          <div className="h-4 bg-gray-200 rounded"></div>
                          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : state.results.length === 0 ? (
              /* No Results */
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Filter className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Aucun résultat trouvé
                </h3>
                <p className="text-gray-600 mb-6">
                  Essayez de modifier vos critères de recherche ou vos filtres.
                </p>
                <button
                  onClick={() => dispatch({ type: 'RESET_SEARCH' })}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Réinitialiser la recherche
                </button>
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
            {!state.loading && state.results.length > 0 && totalPages > 1 && (
              <div className="mt-12 flex justify-center">
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handlePageChange(state.currentPage - 1)}
                    disabled={state.currentPage === 1}
                    className="px-4 py-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    Précédent
                  </button>
                  
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const pageNum = i + 1;
                    const isCurrentPage = pageNum === state.currentPage;
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                          isCurrentPage
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  {totalPages > 5 && (
                    <>
                      <span className="px-2 text-gray-500">...</span>
                      <button
                        onClick={() => handlePageChange(totalPages)}
                        className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                          totalPages === state.currentPage
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                  
                  <button 
                    onClick={() => handlePageChange(state.currentPage + 1)}
                    disabled={state.currentPage === totalPages}
                    className="px-4 py-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}

            {/* Results Summary */}
            {!state.loading && state.results.length > 0 && (
              <div className="mt-8 text-center text-sm text-gray-500">
                Affichage de {((state.currentPage - 1) * state.pageSize) + 1} à {Math.min(state.currentPage * state.pageSize, state.totalResults)} sur {state.totalResults.toLocaleString()} résultats
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}