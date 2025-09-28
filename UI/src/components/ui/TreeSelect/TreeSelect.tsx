import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TreeView from '../TreeView/TreeView';
import { TreeNode as TreeNodeType } from '../../../types/tree';

interface TreeSelectProps {
  nodes: TreeNodeType[];
  selectedNodes?: TreeNodeType[];
  onSelectionChange: (selectedNodes: TreeNodeType[]) => void;
  placeholder?: string;
  multiSelect?: boolean;
  maxSelections?: number;
  disabled?: boolean;
  className?: string;
  searchable?: boolean;
  showCounts?: boolean;
  showIcons?: boolean;
  maxHeight?: string;
  error?: string;
  required?: boolean;
  label?: string;
}

const TreeSelect: React.FC<TreeSelectProps> = ({
  nodes,
  selectedNodes = [],
  onSelectionChange,
  placeholder = "Sélectionner un élément...",
  multiSelect = false,
  maxSelections = 1,
  disabled = false,
  className = '',
  searchable = true,
  showCounts = true,
  showIcons = true,
  maxHeight = '300px',
  error,
  required = false,
  label
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleSelectionChange = useCallback((newSelectedNodes: TreeNodeType[]) => {
    onSelectionChange(newSelectedNodes);
    
    // Close dropdown if single select and something is selected
    if (!multiSelect && newSelectedNodes.length > 0) {
      setIsOpen(false);
    }
  }, [onSelectionChange, multiSelect]);

  const handleRemoveSelection = useCallback((nodeId: string) => {
    const newSelection = selectedNodes.filter(node => node.id !== nodeId);
    onSelectionChange(newSelection);
  }, [selectedNodes, onSelectionChange]);

  const handleClearAll = useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  const getDisplayText = () => {
    if (selectedNodes.length === 0) {
      return placeholder;
    }
    
    if (selectedNodes.length === 1) {
      return selectedNodes[0].label;
    }
    
    return `${selectedNodes.length} élément${selectedNodes.length > 1 ? 's' : ''} sélectionné${selectedNodes.length > 1 ? 's' : ''}`;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 text-left border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${error 
            ? 'border-red-300 bg-red-50' 
            : 'border-gray-300 bg-white hover:bg-gray-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        `}
      >
        <div className="flex items-center justify-between">
          <span className={`truncate ${selectedNodes.length === 0 ? 'text-gray-500' : 'text-gray-900'}`}>
            {getDisplayText()}
          </span>
          <div className="flex items-center space-x-1 ml-2">
            {selectedNodes.length > 0 && !disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearAll();
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      {/* Selected Items Display (for multi-select) */}
      {multiSelect && selectedNodes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {selectedNodes.map((node) => (
            <span
              key={node.id}
              className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
            >
              {node.label}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveSelection(node.id)}
                  className="ml-1 p-0.5 text-blue-600 hover:text-blue-800 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg"
          >
            <TreeView
              nodes={nodes}
              onSelectionChange={handleSelectionChange}
              selectMode={true}
              multiSelect={multiSelect}
              maxSelections={maxSelections}
              searchable={searchable}
              showCounts={showCounts}
              showIcons={showIcons}
              maxHeight={maxHeight}
              className="border-0 rounded-lg"
              placeholder={placeholder}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default TreeSelect;