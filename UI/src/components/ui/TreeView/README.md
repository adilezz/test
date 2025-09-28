# TreeView Context Menu

The TreeView component now supports a context menu that appears when right-clicking on tree nodes. This provides quick access to common actions like view, add, edit, and delete operations.

## Features

- **Right-click activation**: Context menu appears on right-click
- **Smart positioning**: Menu automatically adjusts position to avoid screen edges
- **Keyboard navigation**: Press Escape to close the menu
- **Click outside to close**: Menu closes when clicking outside
- **Conditional actions**: Only shows actions for which handlers are provided
- **Node information**: Displays node type and label in menu header
- **Accessibility**: Full ARIA support for screen readers

## Usage

### Basic Implementation

```tsx
import { TreeView } from './components/ui/TreeView';

const MyComponent = () => {
  const handleNodeView = (node) => {
    console.log('View node:', node);
    // Navigate to detail page
  };

  const handleNodeAdd = (node) => {
    console.log('Add child to node:', node);
    // Open create form
  };

  const handleNodeEdit = (node) => {
    console.log('Edit node:', node);
    // Open edit form
  };

  const handleNodeDelete = (node) => {
    console.log('Delete node:', node);
    // Show confirmation and delete
  };

  return (
    <TreeView
      nodes={nodes}
      // Enable context menu
      showContextMenu={true}
      onNodeView={handleNodeView}
      onNodeAdd={handleNodeAdd}
      onNodeEdit={handleNodeEdit}
      onNodeDelete={handleNodeDelete}
      // ... other props
    />
  );
};
```

### Integration with Existing Code

To add context menu to existing TreeView usage, simply add the context menu props:

```tsx
// Before
<TreeView
  nodes={nodes}
  searchable
  showCounts={false}
  showIcons
  maxHeight="500px"
/>

// After
<TreeView
  nodes={nodes}
  searchable
  showCounts={false}
  showIcons
  maxHeight="500px"
  // Add context menu
  showContextMenu={true}
  onNodeView={handleNodeView}
  onNodeAdd={handleNodeAdd}
  onNodeEdit={handleNodeEdit}
  onNodeDelete={handleNodeDelete}
/>
```

## Props

### Context Menu Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showContextMenu` | `boolean` | `false` | Enable/disable context menu |
| `onNodeView` | `(node: TreeNode) => void` | `undefined` | Handler for view action |
| `onNodeAdd` | `(node: TreeNode) => void` | `undefined` | Handler for add action |
| `onNodeEdit` | `(node: TreeNode) => void` | `undefined` | Handler for edit action |
| `onNodeDelete` | `(node: TreeNode) => void` | `undefined` | Handler for delete action |

### Context Menu Actions

The context menu will only show actions for which you provide handlers:

- **View** (`onNodeView`): Shows "Voir les détails"
- **Add** (`onNodeAdd`): Shows "Ajouter un élément"
- **Edit** (`onNodeEdit`): Shows "Modifier"
- **Delete** (`onNodeDelete`): Shows "Supprimer"

## Examples

### Minimal Context Menu (View Only)

```tsx
<TreeView
  nodes={nodes}
  showContextMenu={true}
  onNodeView={(node) => navigate(`/details/${node.id}`)}
/>
```

### Full Context Menu

```tsx
<TreeView
  nodes={nodes}
  showContextMenu={true}
  onNodeView={(node) => navigate(`/details/${node.id}`)}
  onNodeAdd={(node) => setCreateModalOpen(true)}
  onNodeEdit={(node) => setEditModalOpen(true)}
  onNodeDelete={(node) => setDeleteConfirmOpen(true)}
/>
```

## Implementation Details

### Context Menu Component

The context menu is implemented as a separate `ContextMenu` component that:

- Uses Framer Motion for smooth animations
- Calculates optimal positioning to avoid screen edges
- Handles keyboard navigation (Escape key)
- Manages click-outside-to-close behavior
- Provides accessibility attributes

### TreeNode Integration

The `TreeNode` component has been updated to:

- Accept context menu props
- Handle right-click events
- Pass context menu props to child nodes recursively
- Prevent default browser context menu when custom menu is enabled

### Type Safety

All context menu functionality is fully typed with TypeScript:

```tsx
interface ContextMenuState {
  isVisible: boolean;
  x: number;
  y: number;
  node: TreeNode | null;
}

interface ContextMenuAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
  separator?: boolean;
}
```

## Testing

The context menu functionality is fully tested with:

- Right-click activation
- Action execution
- Keyboard navigation
- Click outside behavior
- Conditional action display
- Node information display

## Accessibility

The context menu is fully accessible:

- Uses `role="menu"` and `role="menuitem"`
- Supports keyboard navigation
- Provides proper ARIA labels
- Works with screen readers
- Maintains focus management

## Performance

The context menu implementation is optimized for performance:

- Uses React.memo for TreeNode components
- Implements efficient event handling
- Minimizes re-renders
- Uses useCallback for event handlers
- Lazy loads context menu component

## Browser Support

The context menu works in all modern browsers:

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Migration Guide

To add context menu to existing TreeView usage:

1. Add `showContextMenu={true}` prop
2. Implement required action handlers
3. Test the functionality
4. Update any existing click handlers if needed

The context menu is backward compatible and won't affect existing functionality when disabled.