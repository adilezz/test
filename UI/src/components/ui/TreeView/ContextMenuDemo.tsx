import React, { useState } from 'react';
import { TreeView } from './index';
import { TreeNode } from '../../types/tree';

// Demo component to test context menu functionality
const ContextMenuDemo: React.FC = () => {
  const [nodes] = useState<TreeNode[]>([
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
            },
            {
              id: '4',
              label: 'Département de Physique',
              type: 'department',
              level: 2,
              count: 30
            }
          ]
        },
        {
          id: '5',
          label: 'Faculté des Lettres',
          type: 'faculty',
          level: 1,
          count: 50,
          children: [
            {
              id: '6',
              label: 'Département de Français',
              type: 'department',
              level: 2,
              count: 20
            }
          ]
        }
      ]
    },
    {
      id: '7',
      label: 'Université Al Akhawayn',
      type: 'university',
      level: 0,
      count: 80,
      children: [
        {
          id: '8',
          label: 'School of Business Administration',
          type: 'school',
          level: 1,
          count: 40
        }
      ]
    }
  ]);

  const handleNodeView = (node: TreeNode) => {
    alert(`View details for: ${node.label} (${node.type})`);
  };

  const handleNodeAdd = (node: TreeNode) => {
    alert(`Add new item under: ${node.label} (${node.type})`);
  };

  const handleNodeEdit = (node: TreeNode) => {
    alert(`Edit: ${node.label} (${node.type})`);
  };

  const handleNodeDelete = (node: TreeNode) => {
    if (confirm(`Are you sure you want to delete: ${node.label}?`)) {
      alert(`Deleted: ${node.label}`);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">TreeView Context Menu Demo</h1>
      <p className="text-gray-600 mb-6">
        Right-click on any node to see the context menu. The menu will show different actions based on the node type.
      </p>
      
      <TreeView
        nodes={nodes}
        showContextMenu={true}
        onNodeView={handleNodeView}
        onNodeAdd={handleNodeAdd}
        onNodeEdit={handleNodeEdit}
        onNodeDelete={handleNodeDelete}
        showCounts={true}
        showIcons={true}
        multiSelect={false}
        searchable={true}
        maxHeight="500px"
      />
    </div>
  );
};

export default ContextMenuDemo;