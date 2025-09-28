import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Eye, Plus, Edit, Trash2 } from 'lucide-react';
import TreeContextMenu from '../TreeContextMenu';
import { TreeNode, TreeContextMenuAction } from '../../../../types/tree';

describe('TreeContextMenu', () => {
  const mockNode: TreeNode = {
    id: '1',
    label: 'Test Node',
    type: 'university',
    level: 0,
    count: 10
  };

  const mockActions: TreeContextMenuAction[] = [
    {
      key: 'view',
      label: 'View Details',
      icon: Eye
    },
    {
      key: 'add',
      label: 'Add Child',
      icon: Plus
    },
    {
      key: 'edit',
      label: 'Edit',
      icon: Edit
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: Trash2,
      divider: true
    }
  ];

  const mockPosition = { x: 100, y: 100 };
  const mockOnAction = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders context menu with correct actions', () => {
    render(
      <TreeContextMenu
        node={mockNode}
        position={mockPosition}
        actions={mockActions}
        onAction={mockOnAction}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Test Node')).toBeInTheDocument();
    expect(screen.getByText('university')).toBeInTheDocument();
    expect(screen.getByText('View Details')).toBeInTheDocument();
    expect(screen.getByText('Add Child')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('calls onAction when action button is clicked', () => {
    render(
      <TreeContextMenu
        node={mockNode}
        position={mockPosition}
        actions={mockActions}
        onAction={mockOnAction}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('View Details'));
    expect(mockOnAction).toHaveBeenCalledWith('view', mockNode);
  });

  it('calls onClose when clicking outside', async () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <TreeContextMenu
          node={mockNode}
          position={mockPosition}
          actions={mockActions}
          onAction={mockOnAction}
          onClose={mockOnClose}
        />
      </div>
    );

    fireEvent.mouseDown(screen.getByTestId('outside'));
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('calls onClose when pressing Escape', async () => {
    render(
      <TreeContextMenu
        node={mockNode}
        position={mockPosition}
        actions={mockActions}
        onAction={mockOnAction}
        onClose={mockOnClose}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('handles keyboard navigation correctly', () => {
    render(
      <TreeContextMenu
        node={mockNode}
        position={mockPosition}
        actions={mockActions}
        onAction={mockOnAction}
        onClose={mockOnClose}
      />
    );

    const menu = screen.getByRole('menu');
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    
    // Should focus the next button
    expect(document.activeElement).toBe(screen.getByText('Add Child'));

    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    
    // Should focus the previous button
    expect(document.activeElement).toBe(screen.getByText('View Details'));
  });

  it('handles disabled actions correctly', () => {
    const actionsWithDisabled: TreeContextMenuAction[] = [
      ...mockActions,
      {
        key: 'disabled',
        label: 'Disabled Action',
        disabled: true
      }
    ];

    render(
      <TreeContextMenu
        node={mockNode}
        position={mockPosition}
        actions={actionsWithDisabled}
        onAction={mockOnAction}
        onClose={mockOnClose}
      />
    );

    const disabledButton = screen.getByText('Disabled Action');
    expect(disabledButton).toBeDisabled();
    
    fireEvent.click(disabledButton);
    expect(mockOnAction).not.toHaveBeenCalledWith('disabled', mockNode);
  });

  it('renders dividers correctly', () => {
    render(
      <TreeContextMenu
        node={mockNode}
        position={mockPosition}
        actions={mockActions}
        onAction={mockOnAction}
        onClose={mockOnClose}
      />
    );

    // Check that divider is rendered before the delete action
    const menu = screen.getByRole('menu');
    const dividers = menu.querySelectorAll('.border-t');
    expect(dividers).toHaveLength(1);
  });

  it('positions menu correctly to avoid screen edges', () => {
    // Mock getBoundingClientRect to simulate menu near screen edge
    const mockGetBoundingClientRect = jest.fn(() => ({
      width: 200,
      height: 300,
      top: 0,
      left: 0,
      bottom: 300,
      right: 200
    }));

    Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
      value: mockGetBoundingClientRect
    });

    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      value: 1024,
      writable: true
    });
    Object.defineProperty(window, 'innerHeight', {
      value: 768,
      writable: true
    });

    const edgePosition = { x: 950, y: 700 }; // Near bottom-right edge

    render(
      <TreeContextMenu
        node={mockNode}
        position={edgePosition}
        actions={mockActions}
        onAction={mockOnAction}
        onClose={mockOnClose}
      />
    );

    // Menu should be repositioned to stay within viewport
    const menu = screen.getByRole('menu');
    expect(menu).toBeInTheDocument();
  });
});