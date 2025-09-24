@@ .. @@
 import { useSearch } from '../../contexts/SearchContext';
 import FilterPanel from '../ui/FilterPanel';
 import ThesisCard from '../ui/ThesisCard';
 import SearchBar from '../ui/SearchBar';
+import { apiService } from '../../services/api';

-const mockTheses = [
-  {
-    id: '1',
-    title: 'L\'impact de l\'intelligence artificielle sur le diagnostic médical au Maroc',
-    author: 'Dr. Fatima Zahra Benali',
-    director: 'Pr. Mohammed Alami',
-    institution: 'Université Mohammed Premier de Oujda',
-    year: 2024,
-    discipline: 'Médecine',
-    abstract: 'Cette recherche examine l\'application de l\'IA dans le diagnostic médical, analysant son efficacité, ses défis éthiques et son potentiel d\'amélioration des soins de santé au Maroc...',
-    availability: 'available' as const,
-    downloadCount: 1234,
-    viewCount: 5678,
-    pages: 287,
-    language: 'Français'
-  },
-  {
-    id: '2',
-    title: 'Développement durable et transition énergétique dans les villes marocaines',
-    author: 'Dr. Youssef Alami',
-    director: 'Pr. Aicha Benomar',
-    institution: 'Université Hassan II de Casablanca',
-    year: 2023,
-    discipline: 'Économie',
-    abstract: 'Analyse des politiques de développement durable et des stratégies de transition énergétique mises en place dans les principales villes du Maroc...',
-    availability: 'preparing' as const,
-    downloadCount: 987,
-    viewCount: 3456,
-    pages: 324,
-    language: 'Français'
-  },
-  {
-    id: '3',
-    title: 'Préservation du patrimoine culturel amazigh à travers les technologies numériques',
-    author: 'Dr. Aicha Idrissi',
-    director: 'Pr. Hassan Ouali',
-    institution: 'Université Ibn Tofail de Kénitra',
-    year: 2023,
-    discipline: 'Sciences Sociales',
-    abstract: 'Étude sur l\'utilisation des technologies numériques pour documenter, préserver et transmettre le patrimoine culturel amazigh...',
-    availability: 'available' as const,
-    downloadCount: 756,
-    viewCount: 2134,
-    pages: 198,
-    language: 'Français'
-  },
-  {
-    id: '4',
-    title: 'Innovations en agriculture biologique et sécurité alimentaire',
-    author: 'Dr. Omar Senhaji',
-    director: 'Pr. Nadia Skalli',
-    institution: 'Université Cadi Ayyad de Marrakech',
-    year: 2024,
-    discipline: 'Agriculture',
-    abstract: 'Recherche sur les pratiques agricoles biologiques innovantes et leur contribution à la sécurité alimentaire nationale...',
-    availability: 'unavailable' as const,
-    downloadCount: 543,
-    viewCount: 1876,
-    pages: 245,
-    language: 'Français'
-  }
-];

 export default function SearchResultsPage() {
@@ .. @@
   useEffect(() => {
-    // Simulate API call
-    const timer = setTimeout(() => {
-      dispatch({
-        type: 'SET_RESULTS',
-        payload: {
-          results: mockTheses,
-          total: mockTheses.length
-        }
-      });
-    }, 500);
-
-    return () => clearTimeout(timer);
-  }, [state.query, state.filters, sortBy, dispatch]);
+    const searchTheses = async () => {
+      dispatch({ type: 'SET_LOADING', payload: true });
+      
+      try {
+        const searchParams = {
+          q: state.query,
+          filters: state.filters,
+          sort_by: sortBy as any,
+          sort_order: state.sortOrder,
+          page: state.currentPage,
+          size: 12
+        };
+        
+        const response = await apiService.searchTheses(searchParams);
+        
+        dispatch({
+          type: 'SET_RESULTS',
+          payload: {
+            results: response.items,
+            total: response.total
+          }
+        });
+      } catch (error) {
+        console.error('Search error:', error);
+        dispatch({
+          type: 'SET_RESULTS',
+          payload: {
+            results: [],
+            total: 0
+          }
+        });
+      } finally {
+        dispatch({ type: 'SET_LOADING', payload: false });
+      }
+    };
+
+    searchTheses();
+  }, [state.query, state.filters, sortBy, state.sortOrder, state.currentPage, dispatch]);

   const sortOptions = [
     { value: 'relevance', label: 'Pertinence' },
-    { value: 'date_desc', label: 'Plus récent' },
-    { value: 'date_asc', label: 'Plus ancien' },
+    { value: 'defense_date', label: 'Date de soutenance' },
+    { value: 'created_at', label: 'Date de création' },
     { value: 'title', label: 'Titre A-Z' },
-    { value: 'downloads', label: 'Téléchargements' }
+    { value: 'author', label: 'Auteur' },
+    { value: 'download_count', label: 'Téléchargements' },
+    { value: 'view_count', label: 'Vues' },
+    { value: 'university', label: 'Université' },
+    { value: 'faculty', label: 'Faculté' }
   ];

@@ .. @@
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
+                  
+                  {/* Sort Order */}
+                  <div className="flex bg-gray-100 rounded-lg p-1">
+                    <button
+                      onClick={() => dispatch({ type: 'SET_SORT_ORDER', payload: 'desc' })}
+                      className={`px-3 py-1 rounded-md text-sm transition-all duration-200 ${
+                        state.sortOrder === 'desc' 
+                          ? 'bg-white text-gray-900 shadow-sm' 
+                          : 'text-gray-500 hover:text-gray-700'
+                      }`}
+                    >
+                      Desc
+                    </button>
+                    <button
+                      onClick={() => dispatch({ type: 'SET_SORT_ORDER', payload: 'asc' })}
+                      className={`px-3 py-1 rounded-md text-sm transition-all duration-200 ${
+                        state.sortOrder === 'asc' 
+                          ? 'bg-white text-gray-900 shadow-sm' 
+                          : 'text-gray-500 hover:text-gray-700'
+                      }`}
+                    >
+                      Asc
+                    </button>
+                  </div>

                   {/* View Mode Toggle */}