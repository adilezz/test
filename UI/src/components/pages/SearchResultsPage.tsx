import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  SlidersHorizontal,
  Grid,
  List,
  Download,
  BookOpen,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useSearch } from '../../contexts/SearchContext';
import { SortField, SortOrder, SearchRequest } from '../../types/api';
import EnhancedFilterPanel from '../ui/EnhancedFilterPanel';
import EnhancedThesisCard from '../ui/EnhancedThesisCard';
import { useNavigate, useSearchParams } from 'react-router-dom';

type ViewMode = 'grid' | 'list';

const SearchResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, search, setFilters, loadPage } = useSearch();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(true);
  const [selectedTheses, setSelectedTheses] = useState<Set<string>>(new Set());

  // Initialize filters from URL parameters
  useEffect(() => {
    const urlFilters: Partial<SearchRequest> = {};
    
    // Extract search parameters
    const q = searchParams.get('q');
    const university_id = searchParams.get('university_id');
    const category_id = searchParams.get('category_id');
    const language_id = searchParams.get('language_id');
    const degree_id = searchParams.get('degree_id');
    const year_from = searchParams.get('year_from');
    const year_to = searchParams.get('year_to');
    const page = searchParams.get('page');
    const sort_field = searchParams.get('sort_field');
    const sort_order = searchParams.get('sort_order');

    if (q) urlFilters.q = q;
    if (university_id) urlFilters.university_id = university_id;
    if (category_id) urlFilters.category_id = category_id;
    if (language_id) urlFilters.language_id = language_id;
    if (degree_id) urlFilters.degree_id = degree_id;
    if (year_from) urlFilters.year_from = parseInt(year_from);
    if (year_to) urlFilters.year_to = parseInt(year_to);
    if (page) urlFilters.page = parseInt(page);
    if (sort_field) urlFilters.sort_field = sort_field as SortField;
    if (sort_order) urlFilters.sort_order = sort_order as SortOrder;

    if (Object.keys(urlFilters).length > 0) {
      // Only update if different from current filters to avoid loops
      const keys = Object.keys(urlFilters) as Array<keyof SearchRequest>;
      const differs = keys.some((k) => (state.filters as any)[k] !== (urlFilters as any)[k]);
      if (differs) {
        setFilters(urlFilters);
        search(urlFilters);
      }
    }
  }, [searchParams, setFilters, search, state.filters]);

  // Update URL when filters change
  useEffect(() => {
    const newParams = new URLSearchParams();
    
    Object.entries(state.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        newParams.set(key, value.toString());
      }
    });

    const current = searchParams.toString();
    const next = newParams.toString();
    if (current !== next) {
      setSearchParams(newParams);
    }
  }, [state.filters, setSearchParams, searchParams]);

  const handleFiltersChange = useCallback((newFilters: Partial<SearchRequest>) => {
    setFilters({ ...newFilters, page: 1 }); // Reset to first page when filters change
    search({ ...newFilters, page: 1 });
  }, [setFilters, search]);

  const handleSearch = useCallback(() => {
    search();
  }, [search]);

  const handlePageChange = useCallback((page: number) => {
    loadPage(page);
  }, [loadPage]);

  const handleThesisSelect = useCallback((thesisId: string, selected: boolean) => {
    setSelectedTheses(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(thesisId);
      } else {
        newSet.delete(thesisId);
      }
      return newSet;
    });
  }, []);

  const handleBulkDownload = useCallback(async () => {
    if (selectedTheses.size === 0) return;
    
    // Implementation for bulk download
    console.log('Bulk downloading:', selectedTheses);
  }, [selectedTheses]);

  const renderPagination = () => {
    const { currentPage, totalPages } = state;
    if (totalPages <= 1) return null;

    const pages = [];
    const showEllipsis = totalPages > 7;
    
    if (showEllipsis) {
      // Show first page, current page range, and last page
      if (currentPage > 3) {
        pages.push(1);
        if (currentPage > 4) pages.push('...');
      }
      
      for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        if (currentPage < totalPages - 3) pages.push('...');
        pages.push(totalPages);
      }
    } else {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    }

    return (
      <div className="flex items-center justify-center space-x-2 mt-8">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn-ghost p-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        {pages.map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === 'number' ? handlePageChange(page) : undefined}
            disabled={page === '...'}
            className={`px-3 py-2 text-sm rounded-lg transition-colors duration-200 ${
              page === currentPage
                ? 'bg-primary-600 text-white'
                : page === '...'
                ? 'cursor-default text-gray-400'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {page}
          </button>
        ))}
        
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn-ghost p-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className="text-center py-16">
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Search className="w-12 h-12 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Aucune thèse trouvée
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        Essayez de modifier vos critères de recherche ou d'utiliser des mots-clés différents.
      </p>
      <button
        onClick={() => {
          setFilters({
            page: 1,
            limit: 20,
            sort_field: SortField.CREATED_AT,
            sort_order: SortOrder.DESC
          });
          search();
        }}
        className="btn-primary"
      >
        Réinitialiser la recherche
      </button>
    </div>
  );

  const renderErrorState = () => (
    <div className="text-center py-16">
      <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <AlertCircle className="w-12 h-12 text-red-500" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Erreur de recherche
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {state.error || 'Une erreur est survenue lors de la recherche.'}
      </p>
      <button onClick={handleSearch} className="btn-primary">
        Réessayer
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Recherche de thèses
              </h1>
              {state.totalResults > 0 && (
                <p className="text-gray-600 mt-2">
                  {state.totalResults.toLocaleString()} thèse{state.totalResults > 1 ? 's' : ''} trouvée{state.totalResults > 1 ? 's' : ''}
                  {state.filters.q && (
                    <span> pour "{state.filters.q}"</span>
                  )}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-white rounded-lg border border-gray-200 p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${
                    viewMode === 'grid'
                      ? 'bg-primary-100 text-primary-600'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title="Vue grille"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${
                    viewMode === 'list'
                      ? 'bg-primary-100 text-primary-600'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title="Vue liste"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-secondary"
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                {showFilters ? 'Masquer' : 'Afficher'} les filtres
              </button>

              {/* Bulk Actions */}
              {selectedTheses.size > 0 && (
                <button
                  onClick={handleBulkDownload}
                  className="btn-primary"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger ({selectedTheses.size})
                </button>
              )}
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par titre, auteur, mots-clés..."
              value={state.filters.q || ''}
              onChange={(e) => setFilters({ ...state.filters, q: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="input-field pl-12 pr-4 py-3 w-full"
            />
          </div>
        </div>

        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <AnimatePresence>
            {showFilters && (
              <motion.aside
                initial={{ opacity: 0, x: -300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -300 }}
                transition={{ duration: 0.3 }}
                className="w-80 flex-shrink-0"
              >
                <div className="sticky top-8">
                  <EnhancedFilterPanel
                    filters={state.filters}
                    onFiltersChange={handleFiltersChange}
                    onSearch={handleSearch}
                    isLoading={state.isLoading}
                  />
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Results Header */}
            {state.totalResults > 0 && (
              <div className="flex items-center justify-between mb-6 p-4 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    Page {state.currentPage} sur {state.totalPages}
                  </span>
                  <span className="text-sm text-gray-400">•</span>
                  <span className="text-sm text-gray-600">
                    {((state.currentPage - 1) * (state.filters.limit || 20)) + 1}-{Math.min(state.currentPage * (state.filters.limit || 20), state.totalResults)} sur {state.totalResults.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center space-x-4">
                  <select
                    value={`${state.filters.sort_field}-${state.filters.sort_order}`}
                    onChange={(e) => {
                      const [sort_field, sort_order] = e.target.value.split('-');
                      handleFiltersChange({
                        ...state.filters,
                        sort_field: sort_field as SortField,
                        sort_order: sort_order as SortOrder
                      });
                    }}
                    className="input-field text-sm py-2"
                  >
                    <option value={`${SortField.CREATED_AT}-${SortOrder.DESC}`}>Plus récent</option>
                    <option value={`${SortField.CREATED_AT}-${SortOrder.ASC}`}>Plus ancien</option>
                    <option value={`${SortField.TITLE}-${SortOrder.ASC}`}>Titre A-Z</option>
                    <option value={`${SortField.TITLE}-${SortOrder.DESC}`}>Titre Z-A</option>
                    <option value={`${SortField.AUTHOR}-${SortOrder.ASC}`}>Auteur A-Z</option>
                    <option value={`${SortField.DEFENSE_DATE}-${SortOrder.DESC}`}>Date de soutenance</option>
                  </select>
                </div>
              </div>
            )}

            {/* Loading State */}
            {state.isLoading && (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
                  <p className="text-gray-600">Recherche en cours...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {state.error && !state.isLoading && renderErrorState()}

            {/* Empty State */}
            {!state.isLoading && !state.error && state.results.length === 0 && renderEmptyState()}

            {/* Results Grid/List */}
            {!state.isLoading && !state.error && state.results.length > 0 && (
              <>
                <motion.div
                  layout
                  className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
                      : 'space-y-4'
                  }
                >
                  {state.results.map((thesis) => (
                    <motion.div
                      key={thesis.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <EnhancedThesisCard
                        thesis={thesis}
                        variant={viewMode === 'list' ? 'compact' : 'default'}
                        onView={(thesis) => navigate(`/thesis/${thesis.id}`)}
                        onBookmark={(thesis) => handleThesisSelect(thesis.id, !selectedTheses.has(thesis.id))}
                      />
                    </motion.div>
                  ))}
                </motion.div>

                {/* Pagination */}
                {renderPagination()}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default SearchResultsPage;