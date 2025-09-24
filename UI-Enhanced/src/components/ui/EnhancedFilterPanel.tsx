import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  Search,
  Calendar,
  Hash,
  Globe,
  BookOpen,
  University,
  Building2,
  Users,
  Tag,
  RefreshCw
} from 'lucide-react';
import { TreeView } from './TreeView';
import { TreeNode as TreeNodeType } from '../../types/tree';
import {
  SearchRequest,
  SortField,
  SortOrder,
  LanguageCode,
  ThesisStatus,
  TreeNodeData
} from '../../types/api';
import apiService from '../../services/api';

interface FilterGroup {
  key: keyof SearchRequest;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  type: 'tree' | 'checkbox' | 'daterange' | 'numberrange' | 'text' | 'select';
  options?: Array<{ label: string; value: string; count?: number }>;
  treeEndpoint?: () => Promise<TreeNodeData[]>;
  placeholder?: string;
  min?: number;
  max?: number;
}

interface EnhancedFilterPanelProps {
  filters: Partial<SearchRequest>;
  onFiltersChange: (filters: Partial<SearchRequest>) => void;
  onSearch?: () => void;
  isLoading?: boolean;
  className?: string;
}

const filterGroups: FilterGroup[] = [
  {
    key: 'university_id',
    title: 'Établissements',
    icon: University,
    type: 'tree',
    treeEndpoint: () => apiService.getUniversitiesTree(false, 0)
  },
  {
    key: 'category_id',
    title: 'Catégories',
    icon: Tag,
    type: 'tree',
    treeEndpoint: () => apiService.getCategoriesTree()
  },
  {
    key: 'language_id',
    title: 'Langue',
    icon: Globe,
    type: 'checkbox',
    options: [
      { label: 'Français', value: LanguageCode.FRENCH },
      { label: 'Arabe', value: LanguageCode.ARABIC },
      { label: 'Anglais', value: LanguageCode.ENGLISH },
      { label: 'Tamazight', value: LanguageCode.BERBER }
    ]
  },
  {
    key: 'degree_id',
    title: 'Diplôme',
    icon: BookOpen,
    type: 'checkbox',
    options: [] // Will be loaded from API
  },
  {
    key: 'year_from',
    title: 'Période',
    icon: Calendar,
    type: 'numberrange',
    min: 1950,
    max: new Date().getFullYear()
  },
  {
    key: 'page_count_min',
    title: 'Nombre de pages',
    icon: Hash,
    type: 'numberrange',
    min: 1,
    max: 1000
  }
];

const sortOptions = [
  { label: 'Date de création', value: SortField.CREATED_AT },
  { label: 'Date de mise à jour', value: SortField.UPDATED_AT },
  { label: 'Titre', value: SortField.TITLE },
  { label: 'Auteur', value: SortField.AUTHOR },
  { label: 'Date de soutenance', value: SortField.DEFENSE_DATE },
  { label: 'Université', value: SortField.UNIVERSITY }
];

const EnhancedFilterPanel: React.FC<EnhancedFilterPanelProps> = ({
  filters,
  onFiltersChange,
  onSearch,
  isLoading = false,
  className = ''
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['university_id', 'category_id'])
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [treeData, setTreeData] = useState<Record<string, TreeNodeType[]>>({});
  const [loadingTrees, setLoadingTrees] = useState<Set<string>>(new Set());
  const [degrees, setDegrees] = useState<Array<{ label: string; value: string }>>([]);

  // Load tree data when groups are expanded
  const loadTreeData = useCallback(async (groupKey: string, group: FilterGroup) => {
    if (!group.treeEndpoint || treeData[groupKey] || loadingTrees.has(groupKey)) {
      return;
    }

    setLoadingTrees(prev => new Set([...prev, groupKey]));
    
    try {
      const data = await group.treeEndpoint();
      const treeNodes: TreeNodeType[] = data.map(item => ({
        id: item.id,
        label: item.name_fr,
        label_ar: item.name_ar,
        label_en: item.name_en,
        count: item.thesis_count || 0,
        type: groupKey === 'university_id' ? 'university' : 'category',
        level: 0,
        children: item.children?.map(child => ({
          id: child.id,
          label: child.name_fr,
          label_ar: child.name_ar,
          label_en: child.name_en,
          count: child.thesis_count || 0,
          type: groupKey === 'university_id' ? 'faculty' : 'category',
          level: 1,
          children: child.children?.map(grandchild => ({
            id: grandchild.id,
            label: grandchild.name_fr,
            label_ar: grandchild.name_ar,
            label_en: grandchild.name_en,
            count: grandchild.thesis_count || 0,
            type: groupKey === 'university_id' ? 'department' : 'category',
            level: 2
          }))
        }))
      }));
      
      setTreeData(prev => ({ ...prev, [groupKey]: treeNodes }));
    } catch (error) {
      console.error(`Failed to load tree data for ${groupKey}:`, error);
    } finally {
      setLoadingTrees(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupKey);
        return newSet;
      });
    }
  }, [treeData, loadingTrees]);

  // Load degrees on mount
  useEffect(() => {
    const loadDegrees = async () => {
      try {
        const response = await apiService.getDegrees(1, 100);
        const degreeOptions = response.data.map((degree: any) => ({
          label: degree.name_fr,
          value: degree.id
        }));
        setDegrees(degreeOptions);
        
        // Update the degrees filter group
        const degreeGroup = filterGroups.find(g => g.key === 'degree_id');
        if (degreeGroup) {
          degreeGroup.options = degreeOptions;
        }
      } catch (error) {
        console.error('Failed to load degrees:', error);
      }
    };

    loadDegrees();
  }, []);

  const toggleGroup = useCallback((groupKey: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
        // Load tree data if needed
        const group = filterGroups.find(g => g.key === groupKey);
        if (group?.type === 'tree') {
          loadTreeData(groupKey, group);
        }
      }
      return newSet;
    });
  }, [loadTreeData]);

  const handleFilterChange = useCallback((key: keyof SearchRequest, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  }, [filters, onFiltersChange]);

  const handleTreeNodeSelect = useCallback((groupKey: string, node: TreeNodeType) => {
    handleFilterChange(groupKey as keyof SearchRequest, node.id);
  }, [handleFilterChange]);

  const clearAllFilters = useCallback(() => {
    onFiltersChange({
      page: 1,
      limit: 20,
      sort_field: SortField.CREATED_AT,
      sort_order: SortOrder.DESC
    });
  }, [onFiltersChange]);

  const getActiveFilterCount = useMemo(() => {
    const excludeKeys = ['page', 'limit', 'sort_field', 'sort_order'];
    return Object.entries(filters).filter(([key, value]) => 
      !excludeKeys.includes(key) && 
      value !== undefined && 
      value !== null && 
      value !== ''
    ).length;
  }, [filters]);

  const visibleGroups = showAdvanced ? filterGroups : filterGroups.slice(0, 3);

  const renderFilterGroup = (group: FilterGroup) => {
    const isExpanded = expandedGroups.has(group.key);
    const IconComponent = group.icon;
    const isLoading = loadingTrees.has(group.key);

    return (
      <div key={group.key} className="border-b border-gray-100 last:border-b-0">
        <button
          onClick={() => toggleGroup(group.key)}
          className="flex items-center justify-between w-full p-4 text-left hover:bg-gray-50 transition-colors duration-150"
        >
          <div className="flex items-center space-x-3">
            <IconComponent className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-900">{group.title}</span>
            {isLoading && (
              <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4">
                {group.type === 'tree' && (
                  <div className="max-h-80 overflow-hidden">
                    <TreeView
                      nodes={treeData[group.key] || []}
                      onNodeSelect={(node) => handleTreeNodeSelect(group.key, node)}
                      searchable
                      showCounts
                      showIcons
                      maxHeight="320px"
                      selectedNodeIds={new Set(filters[group.key] ? [filters[group.key] as string] : [])}
                    />
                  </div>
                )}

                {group.type === 'checkbox' && group.options && (
                  <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin">
                    {group.options.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-1 rounded transition-colors duration-150"
                      >
                        <input
                          type="checkbox"
                          checked={filters[group.key] === option.value}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleFilterChange(group.key, option.value);
                            } else {
                              handleFilterChange(group.key, undefined);
                            }
                          }}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                        />
                        <span className="text-sm text-gray-700 flex-1">{option.label}</span>
                        {option.count !== undefined && (
                          <span className="text-xs text-gray-500 badge badge-gray">
                            {option.count.toLocaleString()}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                )}

                {group.type === 'numberrange' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          De
                        </label>
                        <input
                          type="number"
                          min={group.min}
                          max={group.max}
                          value={filters[group.key] || ''}
                          onChange={(e) => handleFilterChange(group.key, e.target.value ? parseInt(e.target.value) : undefined)}
                          className="input-field text-sm"
                          placeholder={group.min?.toString()}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          À
                        </label>
                        <input
                          type="number"
                          min={group.min}
                          max={group.max}
                          value={filters[`${group.key.replace('_min', '_max')}`] || ''}
                          onChange={(e) => handleFilterChange(
                            `${group.key.replace('_min', '_max')}` as keyof SearchRequest, 
                            e.target.value ? parseInt(e.target.value) : undefined
                          )}
                          className="input-field text-sm"
                          placeholder={group.max?.toString()}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {group.type === 'daterange' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Date de début
                        </label>
                        <input
                          type="date"
                          value={filters.defense_date_from || ''}
                          onChange={(e) => handleFilterChange('defense_date_from', e.target.value)}
                          className="input-field text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Date de fin
                        </label>
                        <input
                          type="date"
                          value={filters.defense_date_to || ''}
                          onChange={(e) => handleFilterChange('defense_date_to', e.target.value)}
                          className="input-field text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className={`card ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filtres de recherche</span>
            {getActiveFilterCount > 0 && (
              <span className="badge badge-primary">
                {getActiveFilterCount}
              </span>
            )}
          </h3>
          
          {getActiveFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="btn-ghost text-sm"
              disabled={isLoading}
            >
              <X className="w-4 h-4 mr-1" />
              Effacer
            </button>
          )}
        </div>

        {/* Quick Search */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Recherche rapide (titre, auteur, mots-clés...)"
              value={filters.q || ''}
              onChange={(e) => handleFilterChange('q', e.target.value)}
              className="input-field pl-10 pr-4"
            />
          </div>

          {/* Sort Options */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Trier par
              </label>
              <select
                value={filters.sort_field || SortField.CREATED_AT}
                onChange={(e) => handleFilterChange('sort_field', e.target.value as SortField)}
                className="input-field text-sm"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Ordre
              </label>
              <select
                value={filters.sort_order || SortOrder.DESC}
                onChange={(e) => handleFilterChange('sort_order', e.target.value as SortOrder)}
                className="input-field text-sm"
              >
                <option value={SortOrder.DESC}>Décroissant</option>
                <option value={SortOrder.ASC}>Croissant</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Groups */}
      <div className="divide-y divide-gray-100">
        {visibleGroups.map(renderFilterGroup)}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="btn-ghost text-sm"
          >
            {showAdvanced ? 'Moins de filtres' : 'Plus de filtres'}
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4 ml-1" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-1" />
            )}
          </button>

          {onSearch && (
            <button
              onClick={onSearch}
              disabled={isLoading}
              className="btn-primary"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Rechercher
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedFilterPanel;