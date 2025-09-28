# TreeView Context Menu Implementation

## Overview

The TreeView component has been enhanced with comprehensive context menu functionality, providing users with intuitive right-click access to common actions like view, add, edit, and delete operations on tree nodes.

## Features

### ✅ Core Context Menu Features
- **Right-click activation** - Context menu appears on right-click
- **Keyboard activation** - Shift+F10 or Menu key support
- **Smart positioning** - Automatically avoids screen edges
- **Keyboard navigation** - Arrow keys, Enter, and Escape support
- **Customizable actions** - Define your own menu items with icons
- **Auto-close behavior** - Closes on outside click or Escape key

### ✅ Accessibility Features
- **ARIA labels** - Proper accessibility attributes
- **Keyboard navigation** - Full keyboard support
- **Focus management** - Automatic focus on first item
- **Screen reader support** - Compatible with assistive technologies

### ✅ Visual Features
- **Smooth animations** - Framer Motion powered transitions
- **Icon support** - Lucide React icons for actions
- **Dividers** - Visual separation between action groups
- **Node information** - Shows node name and type in header
- **Disabled states** - Support for disabled actions

## Implementation Details

### Files Modified

1. **`/UI/src/types/tree.ts`**
   - Added `TreeContextMenuAction` interface
   - Added `TreeContextMenuProps` interface  
   - Extended `TreeViewProps` with context menu properties

2. **`/UI/src/components/ui/TreeView/TreeContextMenu.tsx`** (NEW)
   - Complete context menu component implementation
   - Smart positioning logic
   - Keyboard navigation support
   - Accessibility features

3. **`/UI/src/components/ui/TreeView/TreeView.tsx`**
   - Added context menu state management
   - Default action generation
   - Event handling integration
   - Props passing to child components

4. **`/UI/src/components/ui/TreeView/TreeNode.tsx`**
   - Right-click event handling
   - Keyboard shortcut support (Shift+F10, Menu key)
   - Context menu props propagation

5. **`/UI/src/components/ui/TreeView/index.ts`**
   - Updated exports to include new components and types

## Usage Examples

### Basic Usage

```tsx
import TreeView from './components/ui/TreeView/TreeView';

<TreeView
  nodes={treeData}
  showContextMenu={true}
  onNodeView={(node) => console.log('View:', node.label)}
  onNodeAdd={(node) => console.log('Add to:', node.label)}
  onNodeEdit={(node) => console.log('Edit:', node.label)}
  onNodeDelete={(node) => console.log('Delete:', node.label)}
/>
```

### Custom Context Menu Actions

```tsx
import { Eye, Plus, Edit, Trash2, Settings } from 'lucide-react';

const customActions: TreeContextMenuAction[] = [
  {
    key: 'view',
    label: 'Voir les détails',
    icon: Eye
  },
  {
    key: 'add',
    label: 'Ajouter un élément',
    icon: Plus
  },
  {
    key: 'edit',
    label: 'Modifier',
    icon: Edit
  },
  {
    key: 'settings',
    label: 'Paramètres',
    icon: Settings,
    divider: true
  },
  {
    key: 'delete',
    label: 'Supprimer',
    icon: Trash2,
    disabled: node => node.count > 0 // Disable if has children
  }
];

<TreeView
  nodes={treeData}
  showContextMenu={true}
  contextMenuActions={customActions}
  onNodeSelect={(node) => {
    // Handle custom actions here
    switch (actionKey) {
      case 'settings':
        openSettingsModal(node);
        break;
      // ... other custom actions
    }
  }}
/>
```

### Integration with Admin Pages

The context menu has been integrated into admin pages like `AdminUniversitiesPage` and `AdminCategoriesPage`:

```tsx
<TreeView 
  nodes={treeData} 
  showContextMenu={true}
  onNodeView={(node) => {
    const item = findItemByLabel(node.label);
    if (item) openModal('view', item);
  }}
  onNodeEdit={(node) => {
    const item = findItemByLabel(node.label);
    if (item) openModal('edit', item);
  }}
  onNodeDelete={(node) => {
    const item = findItemByLabel(node.label);
    if (item && confirm(`Delete "${node.label}"?`)) {
      handleDelete(item.id);
    }
  }}
/>
```

## API Reference

### TreeViewProps (Extended)

```tsx
interface TreeViewProps {
  // ... existing props
  
  // Context Menu Props
  showContextMenu?: boolean;
  onNodeView?: (node: TreeNode) => void;
  onNodeAdd?: (node: TreeNode) => void;
  onNodeEdit?: (node: TreeNode) => void;
  onNodeDelete?: (node: TreeNode) => void;
  contextMenuActions?: TreeContextMenuAction[];
}
```

### TreeContextMenuAction

```tsx
interface TreeContextMenuAction {
  key: string;                    // Unique action identifier
  label: string;                  // Display text
  icon?: React.ComponentType;     // Lucide icon component
  disabled?: boolean;             // Whether action is disabled
  divider?: boolean;             // Show divider before this action
}
```

### TreeContextMenuProps

```tsx
interface TreeContextMenuProps {
  node: TreeNode;                           // The node being acted upon
  position: { x: number; y: number };       // Menu position
  actions: TreeContextMenuAction[];         // Available actions
  onAction: (actionKey: string, node: TreeNode) => void;  // Action handler
  onClose: () => void;                      // Close handler
}
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Right Click** | Show context menu |
| **Shift + F10** | Show context menu |
| **Menu Key** | Show context menu (if available) |
| **Arrow Up/Down** | Navigate menu items |
| **Enter** | Activate selected menu item |
| **Escape** | Close context menu |

## Testing

### Manual Testing Checklist

- [ ] **Right-click activation** - Context menu appears on right-click
- [ ] **Keyboard activation** - Shift+F10 and Menu key work
- [ ] **Menu positioning** - Menu stays within viewport bounds
- [ ] **Action execution** - All actions (view/add/edit/delete) work correctly
- [ ] **Keyboard navigation** - Arrow keys navigate menu items
- [ ] **Menu closing** - Escape key and outside clicks close menu
- [ ] **Disabled actions** - Disabled items are not clickable
- [ ] **Visual feedback** - Hover states and animations work
- [ ] **Accessibility** - Screen readers can navigate the menu

### Automated Tests

A comprehensive test suite is included in `__tests__/TreeContextMenu.test.tsx`:

- Context menu rendering
- Action execution
- Keyboard navigation
- Outside click handling
- Disabled action handling
- Position adjustment logic

## Browser Support

- **Chrome** 80+
- **Firefox** 75+
- **Safari** 13+
- **Edge** 80+

## Performance Considerations

- Context menu is rendered only when active (conditional rendering)
- Event listeners are properly cleaned up to prevent memory leaks
- Position calculations are optimized to avoid unnecessary reflows
- Keyboard navigation uses efficient DOM queries

## Future Enhancements

Potential future improvements:

1. **Submenu support** - Nested context menus
2. **Action conditions** - Dynamic enable/disable based on node state
3. **Custom positioning** - Manual position override
4. **Touch support** - Long-press activation on mobile devices
5. **Action grouping** - Visual grouping of related actions
6. **Tooltips** - Additional help text for actions

## Migration Guide

If you're updating from the previous TreeView version:

1. **No breaking changes** - Context menu is opt-in via `showContextMenu={true}`
2. **Add handlers** - Implement `onNodeView`, `onNodeAdd`, `onNodeEdit`, `onNodeDelete` as needed
3. **Custom actions** - Define `contextMenuActions` array for custom behavior
4. **Test thoroughly** - Verify existing functionality still works

## Troubleshooting

### Common Issues

1. **Menu not appearing**
   - Ensure `showContextMenu={true}` is set
   - Check that context menu actions are provided
   - Verify event handlers are implemented

2. **Menu positioning issues**
   - Check viewport dimensions
   - Ensure parent containers don't have overflow hidden
   - Test on different screen sizes

3. **Keyboard navigation not working**
   - Verify focus is properly set
   - Check for conflicting keyboard event handlers
   - Ensure menu is properly rendered in DOM

4. **Actions not executing**
   - Verify action handlers are implemented
   - Check console for JavaScript errors
   - Ensure action keys match expected values