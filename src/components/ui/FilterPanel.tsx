@@ .. @@
-import React, { useState } from 'react';
+import React, { useState, useEffect } from 'react';
 import { ChevronDown, ChevronUp, Filter, X } from 'lucide-react';
 import { useSearch } from '../../contexts/SearchContext';
+import { apiService } from '../../services/api';
+import { University, Faculty, School, Degree, Discipline, SubDiscipline, Specialty } from '../../types/api';

-interface FilterOption {
-  label: string;
-  value: string;
-  count: number;
-}
-
-interface FilterGroup {
-  title: string;
-  key: keyof typeof initialState.filters;
-  options: FilterOption[];
-  type: 'checkbox' | 'radio' | 'daterange';
-}
-
-const filterGroups: FilterGroup[] = [
-  {
-    title: 'Discipline',
-    key: 'discipline',
-    type: 'checkbox',
-    options: [
-      { label: 'Médecine', value: 'medicine', count: 1245 },
-      { label: 'Sciences', value: 'sciences', count: 892 },
-      { label: 'Économie', value: 'economics', count: 756 },
-      { label: 'Lettres', value: 'letters', count: 634 },
-      { label: 'Droit', value: 'law', count: 543 },
-      { label: 'Ingénierie', value: 'engineering', count: 421 }
-    ]
-  },
-  {
-    title: 'Établissement',
-    key: 'institution',
-    type: 'checkbox',
-    options: [
-      { label: 'Université Mohammed Premier (Oujda)', value: 'ump_oujda', count: 892 },
-      { label: 'Université Hassan II (Casablanca)', value: 'uh2_casa', count: 756 },
-      { label: 'Université Mohammed V (Rabat)', value: 'um5_rabat', count: 634 },
-      { label: 'Université Cadi Ayyad (Marrakech)', value: 'uca_marrakech', count: 543 },
-      { label: 'Université Ibn Tofail (Kénitra)', value: 'uit_kenitra', count: 421 }
-    ]
-  },
-  {
-    title: 'Langue',
-    key: 'language',
-    type: 'checkbox',
-    options: [
-      { label: 'Français', value: 'fr', count: 2834 },
-      { label: 'Arabe', value: 'ar', count: 1567 },
-      { label: 'Anglais', value: 'en', count: 743 },
-      { label: 'Tamazight', value: 'tzm', count: 89 }
-    ]
-  },
-  {
-    title: 'Disponibilité',
-    key: 'availability',
-    type: 'checkbox',
-    options: [
-      { label: 'Disponible en ligne', value: 'available', count: 3456 },
-      { label: 'En cours de préparation', value: 'preparing', count: 567 },
-      { label: 'Non disponible', value: 'unavailable', count: 234 }
-    ]
-  }
-];

 export default function FilterPanel() {
   const { state, dispatch } = useSearch();
-  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Discipline', 'Établissement']);
+  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Universités', 'Disciplines']);
   const [showAllFilters, setShowAllFilters] = useState(false);
+  
+  // Reference data
+  const [universities, setUniversities] = useState<University[]>([]);
+  const [faculties, setFaculties] = useState<Faculty[]>([]);
+  const [schools, setSchools] = useState<School[]>([]);
+  const [degrees, setDegrees] = useState<Degree[]>([]);
+  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
+  const [subDisciplines, setSubDisciplines] = useState<SubDiscipline[]>([]);
+  const [specialties, setSpecialties] = useState<Specialty[]>([]);
+  
+  const [dateRange, setDateRange] = useState({ start: '', end: '' });
+  const [academicYears, setAcademicYears] = useState<string[]>([]);

+  useEffect(() => {
+    loadReferenceData();
+  }, []);
+
+  const loadReferenceData = async () => {
+    try {
+      const [
+        universitiesData,
+        facultiesData,
+        schoolsData,
+        degreesData,
+        disciplinesData,
+        subDisciplinesData,
+        specialtiesData
+      ] = await Promise.all([
+        apiService.getUniversities(),
+        apiService.getFaculties(),
+        apiService.getSchools(),
+        apiService.getDegrees(),
+        apiService.getDisciplines(),
+        apiService.getSubDisciplines(),
+        apiService.getSpecialties()
+      ]);
+      
+      setUniversities(universitiesData);
+      setFaculties(facultiesData);
+      setSchools(schoolsData);
+      setDegrees(degreesData);
+      setDisciplines(disciplinesData);
+      setSubDisciplines(subDisciplinesData);
+      setSpecialties(specialtiesData);
+      
+      // Generate academic years (last 20 years)
+      const currentYear = new Date().getFullYear();
+      const years = [];
+      for (let i = 0; i < 20; i++) {
+        const year = currentYear - i;
+        years.push(`${year}-${year + 1}`);
+      }
+      setAcademicYears(years);
+    } catch (error) {
+      console.error('Error loading reference data:', error);
+    }
+  };

   const toggleGroup = (groupTitle: string) => {
@@ .. @@
   };

-  const handleFilterChange = (filterKey: string, value: string, checked: boolean) => {
-    const currentValues = state.filters[filterKey as keyof typeof state.filters] as string[];
+  const handleFilterChange = (filterKey: string, value: number | string, checked: boolean) => {
+    const currentValues = (state.filters as any)[filterKey] || [];
     const newValues = checked
       ? [...currentValues, value]
-      : currentValues.filter(v => v !== value);
+      : currentValues.filter((v: any) => v !== value);
     
     dispatch({
       type: 'SET_FILTERS',
       payload: { [filterKey]: newValues }
     });
   };

+  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
+    const newRange = { ...dateRange, [field]: value };
+    setDateRange(newRange);
+    
+    dispatch({
+      type: 'SET_FILTERS',
+      payload: { 
+        defense_date_from: newRange.start,
+        defense_date_to: newRange.end
+      }
+    });
+  };

   const clearAllFilters = () => {
+    setDateRange({ start: '', end: '' });
     dispatch({ type: 'RESET_SEARCH' });
   };

   const getActiveFilterCount = () => {
-    return Object.values(state.filters).reduce((count, filterArray) => {
-      if (Array.isArray(filterArray)) {
-        return count + filterArray.length;
+    let count = 0;
+    const filters = state.filters as any;
+    
+    Object.entries(filters).forEach(([key, value]) => {
+      if (Array.isArray(value) && value.length > 0) {
+        count += value.length;
+      } else if (value && !Array.isArray(value) && key !== 'defense_date_from' && key !== 'defense_date_to') {
+        count += 1;
       }
-      return count;
-    }, 0);
+    });
+    
+    if (filters.defense_date_from || filters.defense_date_to) {
+      count += 1;
+    }
+    
+    return count;
   };

-  const visibleGroups = showAllFilters ? filterGroups : filterGroups.slice(0, 2);
+  const renderFilterGroup = (title: string, items: any[], filterKey: string, valueKey: string = 'id', labelKey: string = 'name') => {
+    const isExpanded = expandedGroups.includes(title);
+    const currentValues = (state.filters as any)[filterKey] || [];
+    
+    return (
+      <div key={title}>
+        <button
+          onClick={() => toggleGroup(title)}
+          className="flex items-center justify-between w-full text-left"
+        >
+          <span className="font-medium text-gray-900">{title}</span>
+          {isExpanded ? (
+            <ChevronUp className="w-4 h-4 text-gray-500" />
+          ) : (
+            <ChevronDown className="w-4 h-4 text-gray-500" />
+          )}
+        </button>
+
+        {isExpanded && (
+          <div className="mt-3 space-y-2 pl-1 max-h-48 overflow-y-auto">
+            {items.map((item) => {
+              const value = item[valueKey];
+              const label = item[labelKey];
+              const isChecked = currentValues.includes(value);
+              
+              return (
+                <label
+                  key={value}
+                  className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 -mx-1 px-1 py-1 rounded transition-colors duration-200"
+                >
+                  <input
+                    type="checkbox"
+                    checked={isChecked}
+                    onChange={(e) => handleFilterChange(filterKey, value, e.target.checked)}
+                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
+                  />
+                  <span className="text-sm text-gray-700 flex-1">{label}</span>
+                </label>
+              );
+            })}
+          </div>
+        )}
+      </div>
+    );
+  };
+
   const activeFilterCount = getActiveFilterCount();

@@ .. @@
       <div className="space-y-6">
-        {visibleGroups.map((group) => (
-          <div key={group.title}>
-            <button
-              onClick={() => toggleGroup(group.title)}
-              className="flex items-center justify-between w-full text-left"
-            >
-              <span className="font-medium text-gray-900">{group.title}</span>
-              {expandedGroups.includes(group.title) ? (
-                <ChevronUp className="w-4 h-4 text-gray-500" />
-              ) : (
-                <ChevronDown className="w-4 h-4 text-gray-500" />
-              )}
-            </button>
-
-            {expandedGroups.includes(group.title) && (
-              <div className="mt-3 space-y-2 pl-1">
-                {group.options.map((option) => {
-                  const isChecked = (state.filters[group.key] as string[]).includes(option.value);
-                  return (
-                    <label
-                      key={option.value}
-                      className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 -mx-1 px-1 py-1 rounded transition-colors duration-200"
-                    >
-                      <input
-                        type="checkbox"
-                        checked={isChecked}
-                        onChange={(e) => handleFilterChange(group.key, option.value, e.target.checked)}
-                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
-                      />
-                      <span className="text-sm text-gray-700 flex-1">{option.label}</span>
-                      <span className="text-xs text-gray-500">({option.count})</span>
-                    </label>
-                  );
-                })}
-              </div>
-            )}
+        {renderFilterGroup('Universités', universities, 'university_ids')}
+        {renderFilterGroup('Facultés', faculties, 'faculty_ids')}
+        {renderFilterGroup('Écoles', schools, 'school_ids')}
+        {renderFilterGroup('Diplômes', degrees, 'degree_ids')}
+        {renderFilterGroup('Disciplines', disciplines, 'discipline_ids')}
+        {renderFilterGroup('Sous-disciplines', subDisciplines, 'sub_discipline_ids')}
+        {renderFilterGroup('Spécialités', specialties, 'specialty_ids')}
+        
+        {/* Languages */}
+        <div>
+          <button
+            onClick={() => toggleGroup('Langues')}
+            className="flex items-center justify-between w-full text-left"
+          >
+            <span className="font-medium text-gray-900">Langues</span>
+            {expandedGroups.includes('Langues') ? (
+              <ChevronUp className="w-4 h-4 text-gray-500" />
+            ) : (
+              <ChevronDown className="w-4 h-4 text-gray-500" />
+            )}
+          </button>
+
+          {expandedGroups.includes('Langues') && (
+            <div className="mt-3 space-y-2 pl-1">
+              {[
+                { value: 'fr', label: 'Français' },
+                { value: 'ar', label: 'Arabe' },
+                { value: 'en', label: 'Anglais' },
+                { value: 'ber', label: 'Berbère' }
+              ].map((lang) => {
+                const isChecked = ((state.filters as any).languages || []).includes(lang.value);
+                return (
+                  <label
+                    key={lang.value}
+                    className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 -mx-1 px-1 py-1 rounded transition-colors duration-200"
+                  >
+                    <input
+                      type="checkbox"
+                      checked={isChecked}
+                      onChange={(e) => handleFilterChange('languages', lang.value, e.target.checked)}
+                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
+                    />
+                    <span className="text-sm text-gray-700 flex-1">{lang.label}</span>
+                  </label>
+                );
+              })}
+            </div>
+          )}
+        </div>
+        
+        {/* Academic Years */}
+        <div>
+          <button
+            onClick={() => toggleGroup('Années académiques')}
+            className="flex items-center justify-between w-full text-left"
+          >
+            <span className="font-medium text-gray-900">Années académiques</span>
+            {expandedGroups.includes('Années académiques') ? (
+              <ChevronUp className="w-4 h-4 text-gray-500" />
+            ) : (
+              <ChevronDown className="w-4 h-4 text-gray-500" />
+            )}
+          </button>
+
+          {expandedGroups.includes('Années académiques') && (
+            <div className="mt-3 space-y-2 pl-1 max-h-32 overflow-y-auto">
+              {academicYears.map((year) => {
+                const isChecked = ((state.filters as any).academic_years || []).includes(year);
+                return (
+                  <label
+                    key={year}
+                    className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 -mx-1 px-1 py-1 rounded transition-colors duration-200"
+                  >
+                    <input
+                      type="checkbox"
+                      checked={isChecked}
+                      onChange={(e) => handleFilterChange('academic_years', year, e.target.checked)}
+                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
+                    />
+                    <span className="text-sm text-gray-700 flex-1">{year}</span>
+                  </label>
+                );
+              })}
+            </div>
+          )}
+        </div>
+        
+        {/* Date Range */}
+        <div>
+          <button
+            onClick={() => toggleGroup('Période de soutenance')}
+            className="flex items-center justify-between w-full text-left"
+          >
+            <span className="font-medium text-gray-900">Période de soutenance</span>
+            {expandedGroups.includes('Période de soutenance') ? (
+              <ChevronUp className="w-4 h-4 text-gray-500" />
+            ) : (
+              <ChevronDown className="w-4 h-4 text-gray-500" />
+            )}
+          </button>
+
+          {expandedGroups.includes('Période de soutenance') && (
+            <div className="mt-3 space-y-3 pl-1">
+              <div>
+                <label className="block text-xs font-medium text-gray-700 mb-1">
+                  Date de début
+                </label>
+                <input
+                  type="date"
+                  value={dateRange.start}
+                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
+                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
+                />
+              </div>
+              <div>
+                <label className="block text-xs font-medium text-gray-700 mb-1">
+                  Date de fin
+                </label>
+                <input
+                  type="date"
+                  value={dateRange.end}
+                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
+                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
+                />
+              </div>
+            </div>
+          )}
+        </div>
+        
+        {/* Status */}
+        <div>
+          <button
+            onClick={() => toggleGroup('Statut')}
+            className="flex items-center justify-between w-full text-left"
+          >
+            <span className="font-medium text-gray-900">Statut</span>
+            {expandedGroups.includes('Statut') ? (
+              <ChevronUp className="w-4 h-4 text-gray-500" />
+            ) : (
+              <ChevronDown className="w-4 h-4 text-gray-500" />
+            )}
+          </button>
+
+          {expandedGroups.includes('Statut') && (
+            <div className="mt-3 space-y-2 pl-1">
+              {[
+                { value: 'published', label: 'Publié' },
+                { value: 'approved', label: 'Approuvé' },
+                { value: 'under_review', label: 'En révision' },
+                { value: 'submitted', label: 'Soumis' },
+                { value: 'draft', label: 'Brouillon' }
+              ].map((status) => {
+                const isChecked = ((state.filters as any).status || []).includes(status.value);
+                return (
+                  <label
+                    key={status.value}
+                    className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 -mx-1 px-1 py-1 rounded transition-colors duration-200"
+                  >
+                    <input
+                      type="checkbox"
+                      checked={isChecked}
+                      onChange={(e) => handleFilterChange('status', status.value, e.target.checked)}
+                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
+                    />
+                    <span className="text-sm text-gray-700 flex-1">{status.label}</span>
+                  </label>
+                );
+              })}
+            </div>
+          )}
+        </div>
+        
+        {/* Visibility */}
+        <div>
+          <button
+            onClick={() => toggleGroup('Visibilité')}
+            className="flex items-center justify-between w-full text-left"
+          >
+            <span className="font-medium text-gray-900">Visibilité</span>
+            {expandedGroups.includes('Visibilité') ? (
+              <ChevronUp className="w-4 h-4 text-gray-500" />
+            ) : (
+              <ChevronDown className="w-4 h-4 text-gray-500" />
+            )}
+          </button>
+
+          {expandedGroups.includes('Visibilité') && (
+            <div className="mt-3 space-y-2 pl-1">
+              {[
+                { value: 'public', label: 'Public' },
+                { value: 'restricted', label: 'Restreint' },
+                { value: 'private', label: 'Privé' }
+              ].map((visibility) => {
+                const isChecked = ((state.filters as any).visibility || []).includes(visibility.value);
+                return (
+                  <label
+                    key={visibility.value}
+                    className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 -mx-1 px-1 py-1 rounded transition-colors duration-200"
+                  >
+                    <input
+                      type="checkbox"
+                      checked={isChecked}
+                      onChange={(e) => handleFilterChange('visibility', visibility.value, e.target.checked)}
+                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
+                    />
+                    <span className="text-sm text-gray-700 flex-1">{visibility.label}</span>
+                  </label>
+                );
+              })}
+            </div>
+          )}
         </div>
-        ))}
-
-        {filterGroups.length > 2 && (
-          <button
-            onClick={() => setShowAllFilters(!showAllFilters)}
-            className="text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200 font-medium"
-          >
-            {showAllFilters ? 'Voir moins de filtres' : 'Voir plus de filtres'}
-          </button>
-        )}
       </div>
     </div>
   );