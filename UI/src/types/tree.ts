export interface TreeNode {
  id: string;
  label: string;
  label_ar?: string;
  label_en?: string;
  count: number;
  type: 'university' | 'faculty' | 'school' | 'department' | 'discipline' | 'subdiscipline' | 'specialty' | 'category' | 'location';
  level: number;
  parentId?: string;
  children?: TreeNode[];
  isExpanded?: boolean;
  isSelected?: boolean;
  isLoading?: boolean;
  metadata?: {
    code?: string;
    established_year?: number;
    website?: string;
    logo_url?: string;
    city?: string;
    region?: string;
    description?: string;
  };
}

export interface TreeViewProps {
  nodes: TreeNode[];
  onNodeSelect?: (node: TreeNode, isMultiSelect?: boolean) => void;
  onNodeExpand?: (node: TreeNode) => void;
  onNodeCollapse?: (node: TreeNode) => void;
  onSearch?: (query: string) => void;
  multiSelect?: boolean;
  searchable?: boolean;
  virtualizeThreshold?: number;
  className?: string;
  maxHeight?: string;
  showCounts?: boolean;
  showIcons?: boolean;
  expandedNodeIds?: Set<string>;
  selectedNodeIds?: Set<string>;
  loadingNodeIds?: Set<string>;
  onLazyLoad?: (node: TreeNode) => Promise<TreeNode[]>;
}

export interface TreeContextType {
  expandedNodes: Set<string>;
  selectedNodes: Set<string>;
  loadingNodes: Set<string>;
  searchQuery: string;
  filteredNodes: TreeNode[];
  toggleExpanded: (nodeId: string) => void;
  toggleSelected: (nodeId: string, isMultiSelect?: boolean) => void;
  setSearchQuery: (query: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  getSelectedNodes: () => TreeNode[];
}

export interface TreeSearchOptions {
  searchFields: (keyof TreeNode)[];
  threshold: number;
  includeChildren: boolean;
  caseSensitive: boolean;
}