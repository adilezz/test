import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronUp, ChevronDown, MoreHorizontal, Check, Square, Eye, Plus, Edit, Trash2 } from 'lucide-react';
import { FixedSizeList as List } from 'react-window';
import Fuse from 'fuse.js';
import { TreeNode as TreeNodeType, TreeViewProps } from '../../../types/tree';
import TreeNode from './TreeNode';

const TreeView: React.FC<TreeViewProps> = ({
  nodes,
  onNodeSelect,
  onNodeExpand,
  onNodeCollapse,
  onSearch,
  multiSelect = false,
  searchable = true,
  virtualizeThreshold = 100,
  className = '',
  maxHeight = '400px',
  showCounts = true,
  showIcons = true,
  expandedNodeIds = new Set(),
  selectedNodeIds = new Set(),
  loadingNodeIds = new Set(),
  onLazyLoad,
  // Context menu support
  showContextMenu = false,
  onNodeView,
  onNodeAdd,
  onNodeEdit,
  onNodeDelete,
  // Select box support
  selectMode = false,
  onSelectionChange,
  maxSelections = 1,
  placeholder = "Sélectionner un élément..."
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(expandedNodeIds);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(selectedNodeIds);
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(loadingNodeIds);
  const [showActions, setShowActions] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    node: TreeNodeType | null;
  }>({ visible: false, x: 0, y: 0, node: null });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const treeContainerRef = useRef<HTMLDivElement>(null);

  // Fuse.js configuration for fuzzy search
  const fuse = useMemo(() => {
    const options = {
      keys: ['label', 'label_ar', 'label_en', 'metadata.description'],
      threshold: 0.3,
      includeScore: true,
      includeMatches: true,
    };
    
    const flattenNodes = (nodeList: TreeNodeType[]): TreeNodeType[] => {
      const result: TreeNodeType[] = [];
      const traverse = (nodes: TreeNodeType[]) => {
        nodes.forEach(node => {
          result.push(node);
          if (node.children) {
            traverse(node.children);
          }
        });
      };
      traverse(nodeList);
      return result;
    };

    return new Fuse(flattenNodes(nodes), options);
  }, [nodes]);

  // Filter nodes based on search query
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return nodes;

    const searchResults = fuse.search(searchQuery);
    const matchedNodeIds = new Set(searchResults.map(result => result.item.id));
    
    // Also include parent nodes of matched nodes
    const includeParents = (nodeList: TreeNodeType[]): TreeNodeType[] => {
      return nodeList.map(node => {
        const hasMatchedDescendant = (n: TreeNodeType): boolean => {
          if (matchedNodeIds.has(n.id)) return true;
          return n.children?.some(hasMatchedDescendant) || false;
        };

        if (hasMatchedDescendant(node)) {
          return {
            ...node,
            children: node.children ? includeParents(node.children) : undefined
          };
        }
        return null;
      }).filter(Boolean) as TreeNodeType[];
    };

    return includeParents(nodes);
  }, [nodes, searchQuery, fuse]);

  // Flatten nodes for virtualization
  const flattenedNodes = useMemo(() => {
    const result: Array<TreeNodeType & { level: number }> = [];
    
    const traverse = (nodeList: TreeNodeType[], level: number = 0) => {
      nodeList.forEach(node => {
        result.push({ ...node, level });
        if (node.children && expandedNodes.has(node.id)) {
          traverse(node.children, level + 1);
        }
      });
    };
    
    traverse(filteredNodes);
    return result;
  }, [filteredNodes, expandedNodes]);

  const handleToggleExpanded = useCallback(async (nodeId: string) => {
    const isCurrentlyExpanded = expandedNodes.has(nodeId);
    const newExpandedNodes = new Set(expandedNodes);
    
    if (isCurrentlyExpanded) {
      newExpandedNodes.delete(nodeId);
      onNodeCollapse?.(nodes.find(n => n.id === nodeId)!);
    } else {
      newExpandedNodes.add(nodeId);
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        onNodeExpand?.(node);
        
        // Handle lazy loading
        if (onLazyLoad && (!node.children || node.children.length === 0)) {
          setLoadingNodes(prev => new Set([...prev, nodeId]));
          try {
            await onLazyLoad(node);
          } finally {
            setLoadingNodes(prev => {
              const newSet = new Set(prev);
              newSet.delete(nodeId);
              return newSet;
            });
          }
        }
      }
    }
    
    setExpandedNodes(newExpandedNodes);
  }, [expandedNodes, nodes, onNodeCollapse, onNodeExpand, onLazyLoad]);

  const handleToggleSelected = useCallback((nodeId: string, isMultiSelect: boolean = false) => {
    const newSelectedNodes = new Set(selectedNodes);
    
    if (isMultiSelect || multiSelect || selectMode) {
      if (selectedNodes.has(nodeId)) {
        newSelectedNodes.delete(nodeId);
      } else {
        // Check max selections limit
        if (maxSelections > 0 && newSelectedNodes.size >= maxSelections && !selectedNodes.has(nodeId)) {
          return; // Don't add if we've reached the limit
        }
        newSelectedNodes.add(nodeId);
      }
    } else {
      newSelectedNodes.clear();
      newSelectedNodes.add(nodeId);
    }
    
    setSelectedNodes(newSelectedNodes);
    
    const selectedNode = nodes.find(n => n.id === nodeId);
    if (selectedNode) {
      onNodeSelect?.(selectedNode, isMultiSelect);
      
      // Notify selection change for select mode
      if (selectMode && onSelectionChange) {
        const selectedNodesList = Array.from(newSelectedNodes)
          .map(id => nodes.find(n => n.id === id))
          .filter(Boolean) as TreeNodeType[];
        onSelectionChange(selectedNodesList);
      }
    }
  }, [selectedNodes, multiSelect, selectMode, maxSelections, nodes, onNodeSelect, onSelectionChange]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch?.(query);
  }, [onSearch]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    onSearch?.('');
    searchInputRef.current?.focus();
  }, [onSearch]);

  const expandAll = useCallback(() => {
    const allNodeIds = new Set<string>();
    const traverse = (nodeList: TreeNodeType[]) => {
      nodeList.forEach(node => {
        allNodeIds.add(node.id);
        if (node.children) {
          traverse(node.children);
        }
      });
    };
    traverse(filteredNodes);
    setExpandedNodes(allNodeIds);
  }, [filteredNodes]);

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  const selectAll = useCallback(() => {
    if (!multiSelect) return;
    const allNodeIds = new Set<string>();
    const traverse = (nodeList: TreeNodeType[]) => {
      nodeList.forEach(node => {
        allNodeIds.add(node.id);
        if (node.children) {
          traverse(node.children);
        }
      });
    };
    traverse(filteredNodes);
    setSelectedNodes(allNodeIds);
  }, [multiSelect, filteredNodes]);

  const clearSelection = useCallback(() => {
    setSelectedNodes(new Set());
  }, []);

  // Context menu handlers
  const handleContextMenu = useCallback((e: React.MouseEvent, node: TreeNodeType) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (showContextMenu) {
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        node
      });
    }
  }, [showContextMenu]);

  const handleContextMenuAction = useCallback((action: 'view' | 'add' | 'edit' | 'delete') => {
    if (!contextMenu.node) return;
    
    switch (action) {
      case 'view':
        onNodeView?.(contextMenu.node);
        break;
      case 'add':
        onNodeAdd?.(contextMenu.node);
        break;
      case 'edit':
        onNodeEdit?.(contextMenu.node);
        break;
      case 'delete':
        onNodeDelete?.(contextMenu.node);
        break;
    }
    
    setContextMenu({ visible: false, x: 0, y: 0, node: null });
  }, [contextMenu.node, onNodeView, onNodeAdd, onNodeEdit, onNodeDelete]);

  const closeContextMenu = useCallback(() => {
    setContextMenu({ visible: false, x: 0, y: 0, node: null });
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'f':
            e.preventDefault();
            searchInputRef.current?.focus();
            break;
          case 'a':
            if (multiSelect) {
              e.preventDefault();
              selectAll();
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [multiSelect, selectAll]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        closeContextMenu();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu.visible, closeContextMenu]);

  // Virtual list item renderer
  const VirtualizedItem = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const node = flattenedNodes[index];
    if (!node) return null;

    return (
      <div style={style}>
        <TreeNode
          node={node}
          level={node.level}
          isExpanded={expandedNodes.has(node.id)}
          isSelected={selectedNodes.has(node.id)}
          isLoading={loadingNodes.has(node.id)}
          hasChildren={Boolean(node.children && node.children.length > 0)}
          onToggleExpanded={handleToggleExpanded}
          onToggleSelected={handleToggleSelected}
          onLazyLoad={onLazyLoad}
          showCounts={showCounts}
          showIcons={showIcons}
          multiSelect={multiSelect || selectMode}
          searchQuery={searchQuery}
          onContextMenu={showContextMenu ? (e) => handleContextMenu(e, node) : undefined}
        />
      </div>
    );
  };

  const selectedCount = selectedNodes.size;
  const totalCount = flattenedNodes.length;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectMode ? placeholder : "Navigation hiérarchique"}
            </h3>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowActions(!showActions)}
              className="btn-ghost p-2"
              title="More actions"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {searchable && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={selectMode ? "Rechercher..." : "Rechercher dans la hiérarchie..."}
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full px-3 py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Action Panel */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg"
            >
              <button onClick={expandAll} className="btn-ghost text-xs">
                <ChevronDown className="w-3 h-3 mr-1" />
                Tout développer
              </button>
              <button onClick={collapseAll} className="btn-ghost text-xs">
                <ChevronUp className="w-3 h-3 mr-1" />
                Tout replier
              </button>
              {multiSelect && (
                <>
                  <button onClick={selectAll} className="btn-ghost text-xs">
                    <Check className="w-3 h-3 mr-1" />
                    Tout sélectionner
                  </button>
                  <button onClick={clearSelection} className="btn-ghost text-xs">
                    <Square className="w-3 h-3 mr-1" />
                    Désélectionner
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
          <span>
            {searchQuery ? `${totalCount} résultats` : `${totalCount} éléments`}
          </span>
          {multiSelect && selectedCount > 0 && (
            <span className="text-primary-600 font-medium">
              {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Tree Content */}
      <div
        ref={treeContainerRef}
        className="overflow-auto scrollbar-thin"
        style={{ maxHeight }}
        role="tree"
        aria-multiselectable={multiSelect}
      >
        {flattenedNodes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchQuery ? 'Aucun résultat trouvé' : 'Aucun élément à afficher'}
          </div>
        ) : flattenedNodes.length > virtualizeThreshold ? (
          <List
            height={parseInt(maxHeight)}
            itemCount={flattenedNodes.length}
            itemSize={36}
            className="scrollbar-thin"
          >
            {VirtualizedItem}
          </List>
        ) : (
          <div className="p-2">
            {filteredNodes.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                level={0}
                isExpanded={expandedNodes.has(node.id)}
                isSelected={selectedNodes.has(node.id)}
                isLoading={loadingNodes.has(node.id)}
                hasChildren={Boolean(node.children && node.children.length > 0)}
                onToggleExpanded={handleToggleExpanded}
                onToggleSelected={handleToggleSelected}
                onLazyLoad={onLazyLoad}
                showCounts={showCounts}
                showIcons={showIcons}
                multiSelect={multiSelect || selectMode}
                searchQuery={searchQuery}
                onContextMenu={showContextMenu ? (e) => handleContextMenu(e, node) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {onNodeView && (
            <button
              onClick={() => handleContextMenuAction('view')}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
            >
              <Eye className="w-4 h-4" />
              <span>Voir</span>
            </button>
          )}
          {onNodeAdd && (
            <button
              onClick={() => handleContextMenuAction('add')}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter</span>
            </button>
          )}
          {onNodeEdit && (
            <button
              onClick={() => handleContextMenuAction('edit')}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
            >
              <Edit className="w-4 h-4" />
              <span>Modifier</span>
            </button>
          )}
          {onNodeDelete && (
            <button
              onClick={() => handleContextMenuAction('delete')}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Supprimer</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TreeView;