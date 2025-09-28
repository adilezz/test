import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Plus, Edit, Trash2, ChevronRight } from 'lucide-react';
import { TreeNode, ContextMenuState, ContextMenuAction } from '../../../types/tree';

interface ContextMenuProps {
  contextMenu: ContextMenuState;
  onClose: () => void;
  onNodeView?: (node: TreeNode) => void;
  onNodeAdd?: (node: TreeNode) => void;
  onNodeEdit?: (node: TreeNode) => void;
  onNodeDelete?: (node: TreeNode) => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  contextMenu,
  onClose,
  onNodeView,
  onNodeAdd,
  onNodeEdit,
  onNodeDelete
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (contextMenu.isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu.isVisible, onClose]);

  // Calculate menu position to avoid screen edges
  const getMenuPosition = useCallback(() => {
    if (!menuRef.current) return { x: contextMenu.x, y: contextMenu.y };

    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = contextMenu.x;
    let y = contextMenu.y;

    // Adjust horizontal position if menu would overflow right edge
    if (x + menuRect.width > viewportWidth) {
      x = viewportWidth - menuRect.width - 10;
    }

    // Adjust vertical position if menu would overflow bottom edge
    if (y + menuRect.height > viewportHeight) {
      y = viewportHeight - menuRect.height - 10;
    }

    // Ensure menu doesn't go off the left or top edges
    x = Math.max(10, x);
    y = Math.max(10, y);

    return { x, y };
  }, [contextMenu.x, contextMenu.y]);

  // Build context menu actions based on available handlers
  const getMenuActions = (): ContextMenuAction[] => {
    const actions: ContextMenuAction[] = [];

    if (onNodeView) {
      actions.push({
        id: 'view',
        label: 'Voir les détails',
        icon: Eye,
        onClick: () => {
          if (contextMenu.node) {
            onNodeView(contextMenu.node);
            onClose();
          }
        }
      });
    }

    if (onNodeAdd) {
      actions.push({
        id: 'add',
        label: 'Ajouter un élément',
        icon: Plus,
        onClick: () => {
          if (contextMenu.node) {
            onNodeAdd(contextMenu.node);
            onClose();
          }
        }
      });
    }

    if (onNodeEdit) {
      actions.push({
        id: 'edit',
        label: 'Modifier',
        icon: Edit,
        onClick: () => {
          if (contextMenu.node) {
            onNodeEdit(contextMenu.node);
            onClose();
          }
        }
      });
    }

    if (onNodeDelete) {
      actions.push({
        id: 'delete',
        label: 'Supprimer',
        icon: Trash2,
        onClick: () => {
          if (contextMenu.node) {
            onNodeDelete(contextMenu.node);
            onClose();
          }
        }
      });
    }

    return actions;
  };

  const menuActions = getMenuActions();

  if (!contextMenu.isVisible || !contextMenu.node || menuActions.length === 0) {
    return null;
  }

  const { x, y } = getMenuPosition();

  return (
    <AnimatePresence>
      {contextMenu.isVisible && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[180px]"
          style={{ left: x, top: y }}
          role="menu"
          aria-label="Context menu"
        >
          {/* Node info header */}
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="text-sm font-medium text-gray-900 truncate">
              {contextMenu.node.label}
            </div>
            <div className="text-xs text-gray-500 capitalize">
              {contextMenu.node.type}
            </div>
          </div>

          {/* Menu actions */}
          <div className="py-1">
            {menuActions.map((action, index) => (
              <React.Fragment key={action.id}>
                {action.separator && index > 0 && (
                  <div className="border-t border-gray-100 my-1" />
                )}
                <button
                  className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  role="menuitem"
                >
                  {action.icon && (
                    <action.icon className="w-4 h-4 mr-3 text-gray-500" />
                  )}
                  <span className="flex-1 text-left">{action.label}</span>
                  {action.id === 'add' && (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Keyboard navigation hint */}
          <div className="px-3 py-2 border-t border-gray-100 text-xs text-gray-400">
            Appuyez sur Échap pour fermer
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ContextMenu;