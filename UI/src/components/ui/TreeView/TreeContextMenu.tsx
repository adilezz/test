import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TreeContextMenuProps } from '../../../types/tree';

const TreeContextMenu: React.FC<TreeContextMenuProps> = ({
  node,
  position,
  actions,
  onAction,
  onClose
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Calculate optimal position to avoid screen edges
  const getAdjustedPosition = useCallback(() => {
    if (!menuRef.current) return position;

    const menu = menuRef.current;
    const menuRect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let { x, y } = position;

    // Adjust horizontal position
    if (x + menuRect.width > viewportWidth) {
      x = Math.max(0, viewportWidth - menuRect.width - 10);
    }

    // Adjust vertical position
    if (y + menuRect.height > viewportHeight) {
      y = Math.max(0, viewportHeight - menuRect.height - 10);
    }

    return { x, y };
  }, [position]);

  // Handle clicks outside the menu
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

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Focus management for keyboard navigation
  useEffect(() => {
    if (menuRef.current) {
      const firstButton = menuRef.current.querySelector('button:not([disabled])') as HTMLButtonElement;
      if (firstButton) {
        firstButton.focus();
      }
    }
  }, []);

  const handleAction = useCallback((actionKey: string) => {
    onAction(actionKey, node);
    onClose();
  }, [onAction, node, onClose]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!menuRef.current) return;

    const buttons = Array.from(menuRef.current.querySelectorAll('button:not([disabled])')) as HTMLButtonElement[];
    const currentIndex = buttons.findIndex(button => button === document.activeElement);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        const nextIndex = (currentIndex + 1) % buttons.length;
        buttons[nextIndex]?.focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        const prevIndex = currentIndex === 0 ? buttons.length - 1 : currentIndex - 1;
        buttons[prevIndex]?.focus();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        (document.activeElement as HTMLButtonElement)?.click();
        break;
    }
  }, []);

  const adjustedPosition = getAdjustedPosition();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50">
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="absolute bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px] max-w-[240px]"
          style={{
            left: adjustedPosition.x,
            top: adjustedPosition.y,
          }}
          onKeyDown={handleKeyDown}
          role="menu"
          aria-label={`Context menu for ${node.label}`}
        >
          {/* Node Info Header */}
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="text-xs font-medium text-gray-900 truncate" title={node.label}>
              {node.label}
            </div>
            <div className="text-xs text-gray-500 capitalize">
              {node.type}
            </div>
          </div>

          {/* Actions */}
          {actions.map((action, index) => (
            <React.Fragment key={action.key}>
              {action.divider && index > 0 && (
                <div className="border-t border-gray-100 my-1" />
              )}
              <button
                className={`
                  w-full px-3 py-2 text-left text-sm flex items-center space-x-2
                  transition-colors duration-150
                  ${action.disabled 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none'
                  }
                `}
                onClick={() => !action.disabled && handleAction(action.key)}
                disabled={action.disabled}
                role="menuitem"
                aria-label={action.label}
              >
                {action.icon && (
                  <action.icon className={`w-4 h-4 flex-shrink-0 ${
                    action.disabled ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                )}
                <span className="flex-1 truncate">{action.label}</span>
              </button>
            </React.Fragment>
          ))}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TreeContextMenu;