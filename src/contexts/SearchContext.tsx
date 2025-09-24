@@ .. @@
-interface SearchState {
-  query: string;
-  filters: {
-    discipline: string[];
-    institution: string[];
-    language: string[];
-    availability: string[];
-    dateRange: { start: string; end: string };
-  };
-  results: any[];
-  loading: boolean;
-  totalResults: number;
-  currentPage: number;
-  sortBy: string;
-}
+import { SearchFilters } from '../types/api';
+
+interface SearchState {
+  query: string;
+  filters: SearchFilters;
+  results: any[];
+  loading: boolean;
+  totalResults: number;
+  currentPage: number;
+  sortBy: string;
+  sortOrder: 'asc' | 'desc';
+}

 type SearchAction = 
   | { type: 'SET_QUERY'; payload: string }
-  | { type: 'SET_FILTERS'; payload: Partial<SearchState['filters']> }
+  | { type: 'SET_FILTERS'; payload: Partial<SearchFilters> }
   | { type: 'SET_RESULTS'; payload: { results: any[]; total: number } }
   | { type: 'SET_LOADING'; payload: boolean }
   | { type: 'SET_PAGE'; payload: number }
   | { type: 'SET_SORT'; payload: string }
+  | { type: 'SET_SORT_ORDER'; payload: 'asc' | 'desc' }
   | { type: 'RESET_SEARCH' };

 const initialState: SearchState = {
   query: '',
-  filters: {
-    discipline: [],
-    institution: [],
-    language: [],
-    availability: [],
-    dateRange: { start: '', end: '' }
-  },
+  filters: {},
   results: [],
   loading: false,
   totalResults: 0,
   currentPage: 1,
-  sortBy: 'relevance'
+  sortBy: 'relevance',
+  sortOrder: 'desc'
 };

@@ .. @@
     case 'SET_SORT':
       return { ...state, sortBy: action.payload, currentPage: 1 };
+    case 'SET_SORT_ORDER':
+      return { ...state, sortOrder: action.payload, currentPage: 1 };
     case 'RESET_SEARCH':
       return initialState;
     default: