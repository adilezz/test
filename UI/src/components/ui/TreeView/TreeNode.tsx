import React, { memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronDown,
  GraduationCap,
  Building2,
  School,
  BookOpen,
  MapPin,
  Loader2,
  Check,
  Minus
} from 'lucide-react';
import { TreeNode as TreeNodeType, TreeContextMenuAction } from '../../../types/tree';

interface TreeNodeProps {
  node: TreeNodeType;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  isLoading: boolean;
  hasChildren: boolean;
  onToggleExpanded: (nodeId: string) => void;
  onToggleSelected: (nodeId: string, isMultiSelect: boolean) => void;
  onLazyLoad?: (node: TreeNodeType) => Promise<TreeNodeType[]>;
  showCounts: boolean;
  showIcons: boolean;
  multiSelect: boolean;
  searchQuery?: string;
  // Context Menu Props
  showContextMenu?: boolean;
  contextMenuActions?: TreeContextMenuAction[];
  onContextMenu?: (node: TreeNodeType, position: { x: number; y: number }) => void;
}

const getNodeIcon = (type: TreeNodeType['type']) => {
  switch (type) {
    case 'university':
      return GraduationCap;
    case 'faculty':
      return Building2;
    case 'school':
      return School;
    case 'department':
      return BookOpen;
    case 'location':
      return MapPin;
    default:
      return BookOpen;
  }
};

const TreeNode: React.FC<TreeNodeProps> = memo(({
  node,
  level,
  isExpanded,
  isSelected,
  isLoading,
  hasChildren,
  onToggleExpanded,
  onToggleSelected,
  onLazyLoad,
  showCounts,
  showIcons,
  multiSelect,
  searchQuery,
  showContextMenu,
  contextMenuActions,
  onContextMenu
}) => {
  const IconComponent = getNodeIcon(node.type);
  const indentation = level * 20;

  const handleExpandClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      if (!isExpanded && onLazyLoad && (!node.children || node.children.length === 0)) {
        try {
          await onLazyLoad(node);
        } catch (error) {
          console.error('Failed to load children for node:', node.id, error);
        }
      }
      onToggleExpanded(node.id);
    }
  }, [hasChildren, isExpanded, onLazyLoad, node, onToggleExpanded]);

  const handleNodeClick = useCallback((e: React.MouseEvent) => {
    const isMultiSelect = e.ctrlKey || e.metaKey || multiSelect;
    onToggleSelected(node.id, isMultiSelect);
  }, [node.id, onToggleSelected, multiSelect]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (!showContextMenu || !onContextMenu || !contextMenuActions?.length) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const position = {
      x: e.clientX,
      y: e.clientY
    };
    
    onContextMenu(node, position);
  }, [showContextMenu, onContextMenu, contextMenuActions, node]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleNodeClick(e as any);
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (hasChildren && !isExpanded) {
          handleExpandClick(e as any);
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (hasChildren && isExpanded) {
          handleExpandClick(e as any);
        }
        break;
      case 'F10':
        if (e.shiftKey && showContextMenu && onContextMenu && contextMenuActions?.length) {
          e.preventDefault();
          e.stopPropagation();
          
          // Get the element's position for context menu positioning
          const element = e.currentTarget as HTMLElement;
          const rect = element.getBoundingClientRect();
          const position = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
          };
          
          onContextMenu(node, position);
        }
        break;
      case 'ContextMenu':
        if (showContextMenu && onContextMenu && contextMenuActions?.length) {
          e.preventDefault();
          e.stopPropagation();
          
          // Get the element's position for context menu positioning
          const element = e.currentTarget as HTMLElement;
          const rect = element.getBoundingClientRect();
          const position = {
            x: rect.right - 10,
            y: rect.top + rect.height / 2
          };
          
          onContextMenu(node, position);
        }
        break;
    }
  }, [handleNodeClick, handleExpandClick, hasChildren, isExpanded, showContextMenu, onContextMenu, contextMenuActions, node]);

  const highlightText = (text: string, query?: string) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-accent-200 text-accent-900 px-0.5 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  const getSelectionIcon = () => {
    if (!multiSelect) return null;
    
    if (isSelected) {
      return <Check className="w-4 h-4 text-primary-600" />;
    }
    
    // Check if partially selected (some children selected)
    const hasSelectedChildren = node.children?.some(child => child.isSelected);
    if (hasSelectedChildren) {
      return <Minus className="w-4 h-4 text-primary-600" />;
    }
    
    return <div className="w-4 h-4 border border-gray-300 rounded" />;
  };

  return (
    <div className="select-none">
      <div
        className={`
          tree-node group relative
          ${isSelected ? 'selected bg-primary-50 text-primary-700' : ''}
          ${level === 0 ? 'font-medium' : ''}
        `}
        style={{ paddingLeft: `${indentation + 8}px` }}
        onClick={handleNodeClick}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isSelected}
        aria-level={level + 1}
      >
        {/* Expand/Collapse Button */}
        <button
          onClick={handleExpandClick}
          className={`
            flex-shrink-0 p-1 rounded hover:bg-gray-200 transition-colors duration-150
            ${!hasChildren ? 'invisible' : ''}
          `}
          disabled={!hasChildren}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          ) : hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )
          ) : null}
        </button>

        {/* Selection Checkbox (Multi-select mode) */}
        {multiSelect && (
          <div className="flex-shrink-0 ml-1">
            {getSelectionIcon()}
          </div>
        )}

        {/* Node Icon */}
        {showIcons && (
          <div className="flex-shrink-0 ml-2">
            <IconComponent className={`w-4 h-4 ${
              isSelected ? 'text-primary-600' : 'text-gray-500'
            }`} />
          </div>
        )}

        {/* Node Label */}
        <span className="flex-1 ml-2 text-sm truncate">
          {highlightText(node.label, searchQuery)}
        </span>

        {/* Count Badge */}
        {showCounts && node.count > 0 && (
          <span className={`
            badge badge-gray ml-2 flex-shrink-0
            ${isSelected ? 'bg-primary-200 text-primary-800' : ''}
          `}>
            {node.count.toLocaleString()}
          </span>
        )}

        {/* Hover Actions */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 ml-2 flex-shrink-0">
          {node.metadata?.website && (
            <a
              href={node.metadata.website}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-gray-400 hover:text-primary-600 transition-colors duration-150"
              onClick={(e) => e.stopPropagation()}
              title="Visit website"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      </div>

      {/* Children */}
      <AnimatePresence>
        {hasChildren && isExpanded && node.children && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="tree-children overflow-hidden"
            role="group"
          >
            {node.children.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                level={level + 1}
                isExpanded={child.isExpanded || false}
                isSelected={child.isSelected || false}
                isLoading={child.isLoading || false}
                hasChildren={Boolean(child.children && child.children.length > 0)}
                onToggleExpanded={onToggleExpanded}
                onToggleSelected={onToggleSelected}
                onLazyLoad={onLazyLoad}
                showCounts={showCounts}
                showIcons={showIcons}
                multiSelect={multiSelect}
                searchQuery={searchQuery}
                showContextMenu={showContextMenu}
                contextMenuActions={contextMenuActions}
                onContextMenu={onContextMenu}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

TreeNode.displayName = 'TreeNode';

export default TreeNode;