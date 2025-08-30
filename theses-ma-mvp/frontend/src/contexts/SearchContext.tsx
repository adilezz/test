import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Thesis, SearchFilters } from '../types';

interface SearchState {
  query: string;
  filters: SearchFilters;
  results: Thesis[];
  loading: boolean;
  totalResults: number;
  currentPage: number;
  pageSize: number;
  sortBy: string;
  searchHistory: string[];
}

type SearchAction = 
  | { type: 'SET_QUERY'; payload: string }
  | { type: 'SET_FILTERS'; payload: Partial<SearchFilters> }
  | { type: 'SET_RESULTS'; payload: { results: Thesis[]; total: number } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_SORT'; payload: string }
  | { type: 'ADD_TO_HISTORY'; payload: string }
  | { type: 'RESET_SEARCH' };

const initialState: SearchState = {
  query: '',
  filters: {
    discipline: [],
    institution: [],
    language: [],
    availability: [],
    dateRange: { start: '', end: '' },
    author: '',
    director: ''
  },
  results: [],
  loading: false,
  totalResults: 0,
  currentPage: 1,
  pageSize: 20,
  sortBy: 'relevance',
  searchHistory: []
};

function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case 'SET_QUERY':
      return { ...state, query: action.payload, currentPage: 1 };
    case 'SET_FILTERS':
      return { 
        ...state, 
        filters: { ...state.filters, ...action.payload },
        currentPage: 1 
      };
    case 'SET_RESULTS':
      return { 
        ...state, 
        results: action.payload.results,
        totalResults: action.payload.total,
        loading: false 
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_PAGE':
      return { ...state, currentPage: action.payload };
    case 'SET_SORT':
      return { ...state, sortBy: action.payload, currentPage: 1 };
    case 'ADD_TO_HISTORY':
      return {
        ...state,
        searchHistory: [
          action.payload,
          ...state.searchHistory.filter(h => h !== action.payload)
        ].slice(0, 10)
      };
    case 'RESET_SEARCH':
      return { ...initialState, searchHistory: state.searchHistory };
    default:
      return state;
  }
}

const SearchContext = createContext<{
  state: SearchState;
  dispatch: React.Dispatch<SearchAction>;
} | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(searchReducer, initialState);

  return (
    <SearchContext.Provider value={{ state, dispatch }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}