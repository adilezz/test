import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { SearchRequest, SortField, SortOrder, PaginatedResponse, ThesisResponse } from '../types/api';
import apiService from '../services/api';

interface SearchState {
  filters: Partial<SearchRequest>;
  results: ThesisResponse[];
  totalResults: number;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  lastSearchQuery: string | null;
}

type SearchAction =
  | { type: 'SET_FILTERS'; payload: Partial<SearchRequest> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_RESULTS'; payload: { results: ThesisResponse[]; total: number; page: number; pages: number } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LAST_QUERY'; payload: string | null }
  | { type: 'RESET_SEARCH' }
  | { type: 'CLEAR_RESULTS' };

const initialState: SearchState = {
  filters: {
    page: 1,
    limit: 20,
    sort_field: SortField.CREATED_AT,
    sort_order: SortOrder.DESC
  },
  results: [],
  totalResults: 0,
  currentPage: 1,
  totalPages: 0,
  isLoading: false,
  error: null,
  lastSearchQuery: null
};

function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload }
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    case 'SET_RESULTS':
      return {
        ...state,
        results: action.payload.results,
        totalResults: action.payload.total,
        currentPage: action.payload.page,
        totalPages: action.payload.pages,
        isLoading: false,
        error: null
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };
    case 'SET_LAST_QUERY':
      return {
        ...state,
        lastSearchQuery: action.payload
      };
    case 'RESET_SEARCH':
      return {
        ...initialState
      };
    case 'CLEAR_RESULTS':
      return {
        ...state,
        results: [],
        totalResults: 0,
        currentPage: 1,
        totalPages: 0,
        error: null
      };
    default:
      return state;
  }
}

interface SearchContextType {
  state: SearchState;
  dispatch: React.Dispatch<SearchAction>;
  search: (filters?: Partial<SearchRequest>) => Promise<void>;
  setFilters: (filters: Partial<SearchRequest>) => void;
  resetSearch: () => void;
  clearResults: () => void;
  loadPage: (page: number) => Promise<void>;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const useSearch = (): SearchContextType => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

interface SearchProviderProps {
  children: React.ReactNode;
}

export const SearchProvider: React.FC<SearchProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(searchReducer, initialState);

  const search = useCallback(async (newFilters?: Partial<SearchRequest>) => {
    const searchFilters = newFilters ? { ...state.filters, ...newFilters } : state.filters;
    
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // For public search, we need to use admin endpoint with proper filters
      const response = await apiService.getTheses(searchFilters as SearchRequest);
      
      dispatch({
        type: 'SET_RESULTS',
        payload: {
          results: response.data,
          total: response.meta.total,
          page: response.meta.page,
          pages: response.meta.pages
        }
      });

      // Update filters with the search parameters used
      if (newFilters) {
        dispatch({ type: 'SET_FILTERS', payload: newFilters });
      }

      // Store the search query for reference
      if (searchFilters.q) {
        dispatch({ type: 'SET_LAST_QUERY', payload: searchFilters.q });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Search failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, [state.filters]);

  const setFilters = useCallback((filters: Partial<SearchRequest>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  const resetSearch = useCallback(() => {
    dispatch({ type: 'RESET_SEARCH' });
  }, []);

  const clearResults = useCallback(() => {
    dispatch({ type: 'CLEAR_RESULTS' });
  }, []);

  const loadPage = useCallback(async (page: number) => {
    await search({ ...state.filters, page });
  }, [search, state.filters]);

  // Auto-search when filters change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (state.filters.q !== undefined && state.filters.q !== state.lastSearchQuery) {
        search();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [state.filters.q, state.lastSearchQuery, search]);

  const value: SearchContextType = {
    state,
    dispatch,
    search,
    setFilters,
    resetSearch,
    clearResults,
    loadPage
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};