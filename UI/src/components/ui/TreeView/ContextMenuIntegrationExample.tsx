import React from 'react';
import { TreeView } from './index';
import { TreeNode } from '../../types/tree';

// Example showing how to integrate context menu with existing admin pages
const ContextMenuIntegrationExample: React.FC = () => {
  // Example of how to add context menu to existing TreeView usage
  const exampleNodes: TreeNode[] = [
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

  // Context menu handlers - these would be implemented based on your specific needs
  const handleNodeView = (node: TreeNode) => {
    console.log('View node:', node);
    // Navigate to detail page or show modal
    // Example: navigate(`/admin/universities/${node.id}`);
  };

  const handleNodeAdd = (node: TreeNode) => {
    console.log('Add child to node:', node);
    // Open create form with parent pre-selected
    // Example: setCreateModalOpen(true); setParentNode(node);
  };

  const handleNodeEdit = (node: TreeNode) => {
    console.log('Edit node:', node);
    // Open edit form with node data
    // Example: setEditModalOpen(true); setEditNode(node);
  };

  const handleNodeDelete = (node: TreeNode) => {
    console.log('Delete node:', node);
    // Show confirmation dialog and delete
    // Example: setDeleteConfirmOpen(true); setDeleteNode(node);
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        TreeView with Context Menu Integration
      </h2>
      <p className="text-gray-600 mb-4">
        Right-click on any node to see the context menu in action.
      </p>
      
      {/* This is how you would modify existing TreeView usage to add context menu */}
      <TreeView
        nodes={exampleNodes}
        searchable
        showCounts={false}
        showIcons
        maxHeight="500px"
        // Add these props to enable context menu
        showContextMenu={true}
        onNodeView={handleNodeView}
        onNodeAdd={handleNodeAdd}
        onNodeEdit={handleNodeEdit}
        onNodeDelete={handleNodeDelete}
      />
    </div>
  );
};

export default ContextMenuIntegrationExample;