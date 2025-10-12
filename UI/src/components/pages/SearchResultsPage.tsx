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
  AlertCircle,
  X,
  ArrowUp
} from 'lucide-react';
import { useSearch } from '../../contexts/SearchContext';
import { SortField, SortOrder, SearchRequest } from '../../types/api';
import EnhancedFilterPanel from '../ui/EnhancedFilterPanel';
import EnhancedThesisCard from '../ui/EnhancedThesisCard';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../ui/ToastContainer';

type ViewMode = 'grid' | 'list';

const STORAGE_KEY = 'thesis_search_filters';
const STORAGE_VIEW_MODE = 'thesis_view_mode';

const SearchResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, search, setFilters, clearFilters, loadPage } = useSearch();
  const toast = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Restore view mode from localStorage
    const saved = localStorage.getItem(STORAGE_VIEW_MODE);
    return (saved as ViewMode) || 'grid';
  });
  const [showFilters, setShowFilters] = useState(true);
  const [selectedTheses, setSelectedTheses] = useState<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(() => {
    // Show only on first visit
    const hasSeenHelp = localStorage.getItem('thesis_keyboard_help_seen');
    return !hasSeenHelp;
  });
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Initialize filters from URL parameters and load initial results
  useEffect(() => {
    if (isInitialized) return;

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
      // URL has parameters, use them
        setFilters(urlFilters);
        search(urlFilters);
    } else {
      // Try to restore from localStorage
      const savedFilters = localStorage.getItem(STORAGE_KEY);
      if (savedFilters) {
        try {
          const parsed = JSON.parse(savedFilters);
          setFilters(parsed);
          search(parsed);
        } catch {
          // If parsing fails, load all theses by default
          search();
        }
      } else {
        // No URL parameters or saved filters, load all theses by default
        search();
      }
    }
    
    setIsInitialized(true);
    setHasLoadedOnce(true);
  }, []);

  // Update URL and localStorage when filters change (but only after initialization)
  useEffect(() => {
    if (!isInitialized) return;

    const newParams = new URLSearchParams();
    
    Object.entries(state.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        newParams.set(key, value.toString());
      }
    });

    const current = searchParams.toString();
    const next = newParams.toString();
    if (current !== next) {
      setSearchParams(newParams, { replace: true });
    }

    // Save to localStorage (excluding page number)
    const { page, ...filtersToSave } = state.filters;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtersToSave));
  }, [state.filters, isInitialized]);

  // Scroll to top when page number changes (pagination)
  useEffect(() => {
    if (isInitialized && state.currentPage > 1) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [state.currentPage, isInitialized]);

  // Show/hide scroll to top button based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K: Focus search bar
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
      
      // Escape: Close filter panel if open
      if (e.key === 'Escape' && showFilters) {
        setShowFilters(false);
      }
      
      // Alt + G: Switch to grid view
      if (e.altKey && e.key === 'g') {
        e.preventDefault();
        setViewMode('grid');
        localStorage.setItem(STORAGE_VIEW_MODE, 'grid');
        toast.info('Mode grille activé');
      }
      
      // Alt + L: Switch to list view
      if (e.altKey && e.key === 'l') {
        e.preventDefault();
        setViewMode('list');
        localStorage.setItem(STORAGE_VIEW_MODE, 'list');
        toast.info('Mode liste activé');
      }
      
      // Alt + F: Toggle filters
      if (e.altKey && e.key === 'f') {
        e.preventDefault();
        setShowFilters(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFilters, toast]);

  const handleFiltersChange = useCallback((newFilters: Partial<SearchRequest>) => {
    const filtersWithPage = { ...newFilters, page: 1 };
    setFilters(filtersWithPage); // Reset to first page when filters change
    search(filtersWithPage);
    // Scroll to top when filters change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setFilters, search]);

  const handleClearFilters = useCallback(() => {
    // Create a clean reset with only the necessary fields (no other filter values)
    const resetFilters: Partial<SearchRequest> = {
      page: 1,
      limit: 20,
      sort_field: SortField.CREATED_AT,
      sort_order: SortOrder.DESC
    };
    clearFilters(resetFilters); // Use clearFilters to completely replace instead of merge
    search(resetFilters);
    toast.success('Filtres réinitialisés', 'Tous les filtres ont été effacés');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [clearFilters, search, toast]);

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

  const getActiveFilters = useCallback(() => {
    const active: Array<{ key: string; label: string; value: string }> = [];
    
    if (state.filters.q) {
      active.push({ key: 'q', label: 'Recherche', value: `"${state.filters.q}"` });
    }
    if (state.filters.university_id) {
      active.push({ key: 'university_id', label: 'Université', value: state.filters.university_id });
    }
    if (state.filters.category_id) {
      active.push({ key: 'category_id', label: 'Catégorie', value: state.filters.category_id });
    }
    if (state.filters.language_id) {
      active.push({ key: 'language_id', label: 'Langue', value: state.filters.language_id });
    }
    if (state.filters.degree_id) {
      active.push({ key: 'degree_id', label: 'Diplôme', value: state.filters.degree_id });
    }
    if (state.filters.year_from || state.filters.year_to) {
      const yearRange = `${state.filters.year_from || '...'} - ${state.filters.year_to || '...'}`;
      active.push({ key: 'year_range', label: 'Année', value: yearRange });
    }
    if (state.filters.page_count_min || state.filters.page_count_max) {
      const pageRange = `${state.filters.page_count_min || '...'} - ${state.filters.page_count_max || '...'} pages`;
      active.push({ key: 'page_count_range', label: 'Pages', value: pageRange });
    }
    
    return active;
  }, [state.filters]);

  const removeFilter = useCallback((key: string) => {
    const newFilters = { ...state.filters };
    
    if (key === 'year_range') {
      delete newFilters.year_from;
      delete newFilters.year_to;
    } else if (key === 'page_count_range') {
      delete newFilters.page_count_min;
      delete newFilters.page_count_max;
    } else {
      delete (newFilters as any)[key];
    }
    
    handleFiltersChange(newFilters);
  }, [state.filters, handleFiltersChange]);

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

  const renderEmptyState = () => {
    const hasActiveFilters = getActiveFilters().length > 0;
    const popularSearches = [
      'Intelligence artificielle',
      'Énergies renouvelables',
      'Médecine',
      'Économie',
      'Droit',
      'Informatique'
    ];

    return (
      <div className="text-center py-16 px-4">
        {/* Icon and Illustration */}
        <div className="relative inline-block mb-6">
          <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto">
            <Search className="w-16 h-16 text-gray-400" />
          </div>
          <div className="absolute -top-2 -right-2 w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">🔍</span>
          </div>
        </div>

        {/* Title and Description */}
        <h3 className="text-2xl font-bold text-gray-900 mb-3">
          {hasActiveFilters ? 'Aucune thèse ne correspond à vos critères' : 'Aucune thèse trouvée'}
        </h3>
        <p className="text-gray-600 mb-8 max-w-lg mx-auto text-lg">
          {hasActiveFilters 
            ? 'Essayez de modifier ou supprimer certains filtres pour élargir votre recherche.'
            : 'Commencez par explorer nos thèses ou utilisez les filtres pour affiner votre recherche.'}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="btn-primary"
            >
              <X className="w-4 h-4 mr-2" />
              Effacer tous les filtres
            </button>
          )}
          <button
            onClick={() => {
              clearFilters({
                page: 1,
                limit: 20,
                sort_field: SortField.CREATED_AT,
                sort_order: SortOrder.DESC
              });
              search();
            }}
            className="btn-secondary"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Voir toutes les thèses
          </button>
        </div>

        {/* Tips Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto mb-8">
          <h4 className="font-semibold text-blue-900 mb-3 flex items-center justify-center">
            <span className="mr-2">💡</span>
            Conseils pour améliorer vos résultats
          </h4>
          <ul className="text-left text-sm text-blue-800 space-y-2">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Utilisez des mots-clés plus généraux ou des synonymes</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Vérifiez l'orthographe de vos termes de recherche</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Essayez de supprimer certains filtres pour élargir la recherche</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Explorez les catégories ou les universités dans le menu de filtres</span>
            </li>
          </ul>
        </div>

        {/* Popular Searches */}
        <div className="max-w-2xl mx-auto">
          <h4 className="text-sm font-medium text-gray-700 mb-4">Recherches populaires:</h4>
          <div className="flex flex-wrap justify-center gap-2">
            {popularSearches.map((term) => (
              <button
                key={term}
                onClick={() => {
                  setFilters({ ...state.filters, q: term, page: 1 });
                  search({ ...state.filters, q: term, page: 1 });
                }}
                className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

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
        {/* Keyboard shortcuts help - dismissible */}
        {showKeyboardHelp && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 text-sm relative"
          >
            <button
              onClick={() => {
                setShowKeyboardHelp(false);
                localStorage.setItem('thesis_keyboard_help_seen', 'true');
              }}
              className="absolute top-2 right-2 p-1 hover:bg-blue-200 rounded transition-colors"
              title="Masquer"
            >
              <X className="w-4 h-4 text-blue-600" />
            </button>
            <div className="flex items-start space-x-2">
              <span className="text-2xl">⌨️</span>
              <div>
                <p className="font-semibold text-blue-900 mb-2">Raccourcis clavier disponibles</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-blue-800">
                  <span>
                    <kbd className="px-2 py-0.5 bg-white border border-blue-300 rounded text-xs font-mono mr-1">Ctrl+K</kbd>
                    Rechercher
                  </span>
                  <span>
                    <kbd className="px-2 py-0.5 bg-white border border-blue-300 rounded text-xs font-mono mr-1">Alt+G</kbd>
                    Vue grille
                  </span>
                  <span>
                    <kbd className="px-2 py-0.5 bg-white border border-blue-300 rounded text-xs font-mono mr-1">Alt+L</kbd>
                    Vue liste
                  </span>
                  <span>
                    <kbd className="px-2 py-0.5 bg-white border border-blue-300 rounded text-xs font-mono mr-1">Alt+F</kbd>
                    Filtres
                  </span>
                  <span>
                    <kbd className="px-2 py-0.5 bg-white border border-blue-300 rounded text-xs font-mono mr-1">Esc</kbd>
                    Fermer filtres
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

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
                  onClick={() => {
                    setViewMode('grid');
                    localStorage.setItem(STORAGE_VIEW_MODE, 'grid');
                  }}
                  className={`p-2 rounded transition-colors duration-150 ${
                    viewMode === 'grid'
                      ? 'bg-primary-100 text-primary-600'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title="Vue grille (Alt+G)"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setViewMode('list');
                    localStorage.setItem(STORAGE_VIEW_MODE, 'list');
                  }}
                  className={`p-2 rounded transition-colors duration-150 ${
                    viewMode === 'list'
                      ? 'bg-primary-100 text-primary-600'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title="Vue liste (Alt+L)"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-secondary"
                title="Afficher/Masquer les filtres (Alt+F)"
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
              placeholder="Rechercher par titre, auteur, mots-clés... (Ctrl+K)"
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
                    onClearFilters={handleClearFilters}
                    isLoading={state.isLoading}
                  />
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Main Content */}
          <main className="flex-1 min-w-0 relative">
            {/* Loading overlay for pagination */}
            {state.isLoading && hasLoadedOnce && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-start justify-center pt-20 rounded-lg">
                <div className="bg-white rounded-lg shadow-lg p-6 flex items-center space-x-3">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                  <span className="text-gray-700 font-medium">Chargement des résultats...</span>
                </div>
              </div>
            )}

            {/* Active Filters Chips */}
            {getActiveFilters().length > 0 && (
              <div className="mb-4 bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">
                    Filtres actifs ({getActiveFilters().length})
                  </span>
                  <button
                    onClick={handleClearFilters}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
                  >
                    Tout effacer
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {getActiveFilters().map((filter) => (
                    <span
                      key={filter.key}
                      className="inline-flex items-center space-x-2 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm border border-primary-200 hover:bg-primary-100 transition-colors group"
                    >
                      <span className="font-medium">{filter.label}:</span>
                      <span className="max-w-xs truncate">{filter.value}</span>
                      <button
                        onClick={() => removeFilter(filter.key)}
                        className="ml-1 hover:bg-primary-200 rounded-full p-0.5 transition-colors"
                        title={`Retirer le filtre ${filter.label}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Results Header */}
            {state.totalResults > 0 && (
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">
                      Page {state.currentPage} sur {state.totalPages}
                    </span>
                    <span className="text-sm text-gray-400">•</span>
                    <span className="text-sm text-gray-600">
                      {((state.currentPage - 1) * (state.filters.limit || 20)) + 1}-{Math.min(state.currentPage * (state.filters.limit || 20), state.totalResults)} sur {state.totalResults.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <label htmlFor="results-per-page" className="text-sm font-medium text-gray-700">
                        Résultats:
                      </label>
                      <select
                        id="results-per-page"
                        value={state.filters.limit || 20}
                        onChange={(e) => {
                          const newLimit = parseInt(e.target.value);
                          handleFiltersChange({
                            ...state.filters,
                            limit: newLimit,
                            page: 1 // Reset to first page
                          });
                        }}
                        className="input-field text-sm py-2 pr-8"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <label htmlFor="sort-field" className="text-sm font-medium text-gray-700">
                        Trier par:
                      </label>
                      <select
                        id="sort-field"
                        value={state.filters.sort_field || SortField.CREATED_AT}
                        onChange={(e) => {
                          handleFiltersChange({
                            ...state.filters,
                            sort_field: e.target.value as SortField
                          });
                        }}
                        className="input-field text-sm py-2 pr-8"
                      >
                        <option value={SortField.CREATED_AT}>Date de création</option>
                        <option value={SortField.TITLE}>Titre</option>
                        <option value={SortField.AUTHOR}>Auteur</option>
                        <option value={SortField.DEFENSE_DATE}>Date de soutenance</option>
                        <option value={SortField.UNIVERSITY}>Université</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <label htmlFor="sort-order" className="text-sm font-medium text-gray-700">
                        Ordre:
                      </label>
                      <select
                        id="sort-order"
                        value={state.filters.sort_order || SortOrder.DESC}
                        onChange={(e) => {
                          handleFiltersChange({
                            ...state.filters,
                            sort_order: e.target.value as SortOrder
                          });
                        }}
                        className="input-field text-sm py-2 pr-8"
                      >
                        <option value={SortOrder.DESC}>Décroissant</option>
                        <option value={SortOrder.ASC}>Croissant</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Pagination at top */}
                {renderPagination()}
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
                <div
                  className={`thesis-results-container ${
                    viewMode === 'grid'
                      ? 'thesis-grid-view'
                      : 'thesis-list-view'
                  }`}
                >
                  {state.results.map((thesis, index) => (
                    <div
                      key={thesis.id}
                      className="thesis-card-wrapper"
                      style={{ 
                        animation: hasLoadedOnce ? 'none' : `fadeIn 0.3s ease-in-out ${index * 0.05}s backwards`
                      }}
                    >
                      <EnhancedThesisCard
                        thesis={thesis}
                        variant={viewMode === 'list' ? 'compact' : 'default'}
                        onView={(thesis) => navigate(`/thesis/${thesis.id}`)}
                        onBookmark={(thesis) => handleThesisSelect(thesis.id, !selectedTheses.has(thesis.id))}
                      />
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {renderPagination()}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-8 right-8 z-50 p-4 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 hover:shadow-xl transition-all duration-200 group"
            title="Retour en haut"
          >
            <ArrowUp className="w-5 h-5 group-hover:-translate-y-1 transition-transform duration-200" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchResultsPage;