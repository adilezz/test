import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TreeView from '../TreeView';
import { TreeNode } from '../../../types/tree';

// Mock sample data
const mockNodes: TreeNode[] = [
  {
    id: '1',
    label: 'Université Mohammed V',
    type: 'university',
    level: 0,
    count: 150,
    children: [
      {
        id: '2',
        label: 'Faculté des Sciences',
        type: 'faculty',
        level: 1,
        count: 75,
        children: [
          {
            id: '3',
            label: 'Département de Mathématiques',
            type: 'department',
            level: 2,
            count: 25
          }
        ]
      }
    ]
  }
];

describe('TreeView Context Menu', () => {
  const mockOnNodeView = jest.fn();
  const mockOnNodeAdd = jest.fn();
  const mockOnNodeEdit = jest.fn();
  const mockOnNodeDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show context menu on right-click when enabled', async () => {
    render(
      <TreeView
        nodes={mockNodes}
        showContextMenu={true}
        onNodeView={mockOnNodeView}
        onNodeAdd={mockOnNodeAdd}
        onNodeEdit={mockOnNodeEdit}
        onNodeDelete={mockOnNodeDelete}
      />
    );

    // Find the tree node
    const treeNode = screen.getByText('Université Mohammed V');
    
    // Right-click on the node
    fireEvent.contextMenu(treeNode);

    // Check if context menu appears
    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    // Check if context menu actions are present
    expect(screen.getByText('Voir les détails')).toBeInTheDocument();
    expect(screen.getByText('Ajouter un élément')).toBeInTheDocument();
    expect(screen.getByText('Modifier')).toBeInTheDocument();
    expect(screen.getByText('Supprimer')).toBeInTheDocument();
  });

  it('should not show context menu when disabled', () => {
    render(
      <TreeView
        nodes={mockNodes}
        showContextMenu={false}
        onNodeView={mockOnNodeView}
        onNodeAdd={mockOnNodeAdd}
        onNodeEdit={mockOnNodeEdit}
        onNodeDelete={mockOnNodeDelete}
      />
    );

    const treeNode = screen.getByText('Université Mohammed V');
    fireEvent.contextMenu(treeNode);

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('should call onNodeView when view action is clicked', async () => {
    render(
      <TreeView
        nodes={mockNodes}
        showContextMenu={true}
        onNodeView={mockOnNodeView}
        onNodeAdd={mockOnNodeAdd}
        onNodeEdit={mockOnNodeEdit}
        onNodeDelete={mockOnNodeDelete}
      />
    );

    const treeNode = screen.getByText('Université Mohammed V');
    fireEvent.contextMenu(treeNode);

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    const viewButton = screen.getByText('Voir les détails');
    fireEvent.click(viewButton);

    expect(mockOnNodeView).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '1',
        label: 'Université Mohammed V',
        type: 'university'
      })
    );
  });

  it('should call onNodeAdd when add action is clicked', async () => {
    render(
      <TreeView
        nodes={mockNodes}
        showContextMenu={true}
        onNodeView={mockOnNodeView}
        onNodeAdd={mockOnNodeAdd}
        onNodeEdit={mockOnNodeEdit}
        onNodeDelete={mockOnNodeDelete}
      />
    );

    const treeNode = screen.getByText('Université Mohammed V');
    fireEvent.contextMenu(treeNode);

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    const addButton = screen.getByText('Ajouter un élément');
    fireEvent.click(addButton);

    expect(mockOnNodeAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '1',
        label: 'Université Mohammed V',
        type: 'university'
      })
    );
  });

  it('should call onNodeEdit when edit action is clicked', async () => {
    render(
      <TreeView
        nodes={mockNodes}
        showContextMenu={true}
        onNodeView={mockOnNodeView}
        onNodeAdd={mockOnNodeAdd}
        onNodeEdit={mockOnNodeEdit}
        onNodeDelete={mockOnNodeDelete}
      />
    );

    const treeNode = screen.getByText('Université Mohammed V');
    fireEvent.contextMenu(treeNode);

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    const editButton = screen.getByText('Modifier');
    fireEvent.click(editButton);

    expect(mockOnNodeEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '1',
        label: 'Université Mohammed V',
        type: 'university'
      })
    );
  });

  it('should call onNodeDelete when delete action is clicked', async () => {
    render(
      <TreeView
        nodes={mockNodes}
        showContextMenu={true}
        onNodeView={mockOnNodeView}
        onNodeAdd={mockOnNodeAdd}
        onNodeEdit={mockOnNodeEdit}
        onNodeDelete={mockOnNodeDelete}
      />
    );

    const treeNode = screen.getByText('Université Mohammed V');
    fireEvent.contextMenu(treeNode);

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('Supprimer');
    fireEvent.click(deleteButton);

    expect(mockOnNodeDelete).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '1',
        label: 'Université Mohammed V',
        type: 'university'
      })
    );
  });

  it('should close context menu when clicking outside', async () => {
    render(
      <TreeView
        nodes={mockNodes}
        showContextMenu={true}
        onNodeView={mockOnNodeView}
        onNodeAdd={mockOnNodeAdd}
        onNodeEdit={mockOnNodeEdit}
        onNodeDelete={mockOnNodeDelete}
      />
    );

    const treeNode = screen.getByText('Université Mohammed V');
    fireEvent.contextMenu(treeNode);

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    // Click outside the menu
    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('should close context menu when pressing Escape', async () => {
    render(
      <TreeView
        nodes={mockNodes}
        showContextMenu={true}
        onNodeView={mockOnNodeView}
        onNodeAdd={mockOnNodeAdd}
        onNodeEdit={mockOnNodeEdit}
        onNodeDelete={mockOnNodeDelete}
      />
    );

    const treeNode = screen.getByText('Université Mohammed V');
    fireEvent.contextMenu(treeNode);

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    // Press Escape key
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('should only show available actions based on provided handlers', async () => {
    render(
      <TreeView
        nodes={mockNodes}
        showContextMenu={true}
        onNodeView={mockOnNodeView}
        // Only provide view handler
      />
    );

    const treeNode = screen.getByText('Université Mohammed V');
    fireEvent.contextMenu(treeNode);

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    // Should only show view action
    expect(screen.getByText('Voir les détails')).toBeInTheDocument();
    expect(screen.queryByText('Ajouter un élément')).not.toBeInTheDocument();
    expect(screen.queryByText('Modifier')).not.toBeInTheDocument();
    expect(screen.queryByText('Supprimer')).not.toBeInTheDocument();
  });

  it('should display node information in context menu header', async () => {
    render(
      <TreeView
        nodes={mockNodes}
        showContextMenu={true}
        onNodeView={mockOnNodeView}
        onNodeAdd={mockOnNodeAdd}
        onNodeEdit={mockOnNodeEdit}
        onNodeDelete={mockOnNodeDelete}
      />
    );

    const treeNode = screen.getByText('Université Mohammed V');
    fireEvent.contextMenu(treeNode);

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    // Check if node info is displayed
    expect(screen.getByText('Université Mohammed V')).toBeInTheDocument();
    expect(screen.getByText('university')).toBeInTheDocument();
  });
});