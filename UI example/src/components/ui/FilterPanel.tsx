import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Filter, X } from 'lucide-react';
import { useSearch } from '../../contexts/SearchContext';

interface FilterOption {
  label: string;
  value: string;
  count: number;
}

interface FilterGroup {
  title: string;
  key: keyof typeof initialState.filters;
  options: FilterOption[];
  type: 'checkbox' | 'radio' | 'daterange';
}

const filterGroups: FilterGroup[] = [
  {
    title: 'Discipline',
    key: 'discipline',
    type: 'checkbox',
    options: [
      { label: 'Médecine', value: 'medicine', count: 1245 },
      { label: 'Sciences', value: 'sciences', count: 892 },
      { label: 'Économie', value: 'economics', count: 756 },
      { label: 'Lettres', value: 'letters', count: 634 },
      { label: 'Droit', value: 'law', count: 543 },
      { label: 'Ingénierie', value: 'engineering', count: 421 }
    ]
  },
  {
    title: 'Établissement',
    key: 'institution',
    type: 'checkbox',
    options: [
      { label: 'Université Mohammed Premier (Oujda)', value: 'ump_oujda', count: 892 },
      { label: 'Université Hassan II (Casablanca)', value: 'uh2_casa', count: 756 },
      { label: 'Université Mohammed V (Rabat)', value: 'um5_rabat', count: 634 },
      { label: 'Université Cadi Ayyad (Marrakech)', value: 'uca_marrakech', count: 543 },
      { label: 'Université Ibn Tofail (Kénitra)', value: 'uit_kenitra', count: 421 }
    ]
  },
  {
    title: 'Langue',
    key: 'language',
    type: 'checkbox',
    options: [
      { label: 'Français', value: 'fr', count: 2834 },
      { label: 'Arabe', value: 'ar', count: 1567 },
      { label: 'Anglais', value: 'en', count: 743 },
      { label: 'Tamazight', value: 'tzm', count: 89 }
    ]
  },
  {
    title: 'Disponibilité',
    key: 'availability',
    type: 'checkbox',
    options: [
      { label: 'Disponible en ligne', value: 'available', count: 3456 },
      { label: 'En cours de préparation', value: 'preparing', count: 567 },
      { label: 'Non disponible', value: 'unavailable', count: 234 }
    ]
  }
];

export default function FilterPanel() {
  const { state, dispatch } = useSearch();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Discipline', 'Établissement']);
  const [showAllFilters, setShowAllFilters] = useState(false);

  const toggleGroup = (groupTitle: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupTitle)
        ? prev.filter(title => title !== groupTitle)
        : [...prev, groupTitle]
    );
  };

  const handleFilterChange = (filterKey: string, value: string, checked: boolean) => {
    const currentValues = state.filters[filterKey as keyof typeof state.filters] as string[];
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter(v => v !== value);
    
    dispatch({
      type: 'SET_FILTERS',
      payload: { [filterKey]: newValues }
    });
  };

  const clearAllFilters = () => {
    dispatch({ type: 'RESET_SEARCH' });
  };

  const getActiveFilterCount = () => {
    return Object.values(state.filters).reduce((count, filterArray) => {
      if (Array.isArray(filterArray)) {
        return count + filterArray.length;
      }
      return count;
    }, 0);
  };

  const visibleGroups = showAllFilters ? filterGroups : filterGroups.slice(0, 2);
  const activeFilterCount = getActiveFilterCount();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <Filter className="w-5 h-5" />
          <span>Filtres</span>
          {activeFilterCount > 0 && (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
              {activeFilterCount}
            </span>
          )}
        </h3>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200"
          >
            Tout effacer
          </button>
        )}
      </div>

      <div className="space-y-6">
        {visibleGroups.map((group) => (
          <div key={group.title}>
            <button
              onClick={() => toggleGroup(group.title)}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="font-medium text-gray-900">{group.title}</span>
              {expandedGroups.includes(group.title) ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {expandedGroups.includes(group.title) && (
              <div className="mt-3 space-y-2 pl-1">
                {group.options.map((option) => {
                  const isChecked = (state.filters[group.key] as string[]).includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 -mx-1 px-1 py-1 rounded transition-colors duration-200"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleFilterChange(group.key, option.value, e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 flex-1">{option.label}</span>
                      <span className="text-xs text-gray-500">({option.count})</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {filterGroups.length > 2 && (
          <button
            onClick={() => setShowAllFilters(!showAllFilters)}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200 font-medium"
          >
            {showAllFilters ? 'Voir moins de filtres' : 'Voir plus de filtres'}
          </button>
        )}
      </div>
    </div>
  );
}